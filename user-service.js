const {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDatabase, isAws, dynamoDb } = require('./db');
const emailService = require('./email-service');

const userTable = process.env.USER_TABLE;

function validateUserId(rwgpsUserId) {
  const userId = Number.parseInt(rwgpsUserId, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(`Invalid rwgpsUserId: ${rwgpsUserId}`);
  }
  return userId;
}

function now() {
  return new Date().toISOString();
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    rwgps_user_id: Number(user.rwgps_user_id),
    email_verified: user.email_verified ? 1 : 0,
  };
}

async function findUserByRwgpsId(rwgpsUserId) {
  const userId = validateUserId(rwgpsUserId);
  if (!isAws) {
    return getDatabase().prepare('SELECT * FROM users WHERE rwgps_user_id = ?').get(userId);
  }
  const result = await dynamoDb.send(new GetCommand({
    TableName: userTable,
    Key: { rwgps_user_id: userId },
  }));
  return normalizeUser(result.Item);
}

async function findUserByEmail(email) {
  if (!isAws) {
    return getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email);
  }
  const result = await dynamoDb.send(new QueryCommand({
    TableName: userTable,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  }));
  return normalizeUser(result.Items?.[0]);
}

async function findUserByVerificationToken(token) {
  if (!isAws) {
    return getDatabase().prepare('SELECT * FROM users WHERE email_verification_token = ?').get(token);
  }
  const result = await dynamoDb.send(new QueryCommand({
    TableName: userTable,
    IndexName: 'verification-token-index',
    KeyConditionExpression: 'email_verification_token = :token',
    ExpressionAttributeValues: { ':token': token },
    Limit: 1,
  }));
  return normalizeUser(result.Items?.[0]);
}

async function createUser(rwgpsUserId, email = null, status = 'waitlist', role = 'user') {
  const userId = validateUserId(rwgpsUserId);
  if (!isAws) {
    getDatabase().prepare(
      'INSERT INTO users (rwgps_user_id, email, status, role) VALUES (?, ?, ?, ?)'
    ).run(userId, email, status, role);
    return findUserByRwgpsId(userId);
  }

  const timestamp = now();
  const user = {
    rwgps_user_id: userId,
    id: userId,
    email_verified: false,
    status,
    role,
    created_at: timestamp,
    updated_at: timestamp,
    ...(email ? { email } : {}),
  };
  await dynamoDb.send(new PutCommand({
    TableName: userTable,
    Item: user,
    ConditionExpression: 'attribute_not_exists(rwgps_user_id)',
  }));
  return normalizeUser(user);
}

async function updateUserEmail(rwgpsUserId, email, verificationToken = null) {
  const userId = validateUserId(rwgpsUserId);
  if (!isAws) {
    getDatabase().prepare(
      "UPDATE users SET email = ?, email_verified = 0, email_verification_token = ?, updated_at = datetime('now') WHERE rwgps_user_id = ?"
    ).run(email, verificationToken, userId);
    return findUserByRwgpsId(userId);
  }
  const result = await dynamoDb.send(new UpdateCommand({
    TableName: userTable,
    Key: { rwgps_user_id: userId },
    UpdateExpression: 'SET email = :email, email_verified = :verified, email_verification_token = :token, updated_at = :updated',
    ExpressionAttributeValues: {
      ':email': email, ':verified': false, ':token': verificationToken, ':updated': now(),
    },
    ReturnValues: 'ALL_NEW',
  }));
  return normalizeUser(result.Attributes);
}

async function verifyEmail(token) {
  const user = await findUserByVerificationToken(token);
  if (!user) return null;
  if (!isAws) {
    getDatabase().prepare(
      "UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = datetime('now') WHERE email_verification_token = ?"
    ).run(token);
    return findUserByRwgpsId(user.rwgps_user_id);
  }
  const result = await dynamoDb.send(new UpdateCommand({
    TableName: userTable,
    Key: { rwgps_user_id: user.rwgps_user_id },
    UpdateExpression: 'SET email_verified = :verified, updated_at = :updated REMOVE email_verification_token',
    ConditionExpression: 'email_verification_token = :token',
    ExpressionAttributeValues: { ':verified': true, ':updated': now(), ':token': token },
    ReturnValues: 'ALL_NEW',
  }));
  return normalizeUser(result.Attributes);
}

async function getAllUsers() {
  if (!isAws) {
    return getDatabase().prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  }
  const users = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamoDb.send(new ScanCommand({ TableName: userTable, ExclusiveStartKey }));
    users.push(...(result.Items || []).map(normalizeUser));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return users.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function updateUser(rwgpsUserId, updates) {
  const userId = validateUserId(rwgpsUserId);
  const currentUser = await findUserByRwgpsId(userId);
  const allowedFields = ['email', 'status', 'role'];
  const entries = Object.entries(updates).filter(([key]) => allowedFields.includes(key));
  if (!entries.length) return currentUser;

  let updatedUser;
  if (!isAws) {
    const fields = entries.map(([key]) => `${key} = ?`);
    const values = entries.map(([, value]) => value);
    fields.push("updated_at = datetime('now')");
    getDatabase().prepare(`UPDATE users SET ${fields.join(', ')} WHERE rwgps_user_id = ?`).run(...values, userId);
    updatedUser = await findUserByRwgpsId(userId);
  } else {
    const names = {};
    const values = { ':updated': now() };
    const setters = entries.map(([key, value], index) => {
      const name = `#field${index}`;
      const valueName = `:value${index}`;
      names[name] = key;
      values[valueName] = value;
      return `${name} = ${valueName}`;
    });
    setters.push('updated_at = :updated');
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: userTable,
      Key: { rwgps_user_id: userId },
      UpdateExpression: `SET ${setters.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    updatedUser = normalizeUser(result.Attributes);
  }
  if (updates.status && currentUser?.status === 'waitlist' && ['beta', 'active'].includes(updates.status) && updatedUser.email) {
    emailService.sendBetaAccessNotification(updatedUser.email, '', updates.status)
      .catch(err => console.error('Failed to send beta access notification:', err));
  }
  return updatedUser;
}

async function updateUserStatus(rwgpsUserId, status) {
  return updateUser(rwgpsUserId, { status });
}

async function updateUserRole(rwgpsUserId, role) {
  return updateUser(rwgpsUserId, { role });
}

async function setEmailVerified(rwgpsUserId, verified) {
  const userId = validateUserId(rwgpsUserId);
  if (!isAws) {
    getDatabase().prepare(
      "UPDATE users SET email_verified = ?, email_verification_token = NULL, updated_at = datetime('now') WHERE rwgps_user_id = ?"
    ).run(verified ? 1 : 0, userId);
    return findUserByRwgpsId(userId);
  }
  const result = await dynamoDb.send(new UpdateCommand({
    TableName: userTable,
    Key: { rwgps_user_id: userId },
    UpdateExpression: 'SET email_verified = :verified, updated_at = :updated REMOVE email_verification_token',
    ExpressionAttributeValues: { ':verified': verified, ':updated': now() },
    ReturnValues: 'ALL_NEW',
  }));
  return normalizeUser(result.Attributes);
}

async function deleteUser(rwgpsUserId) {
  const userId = validateUserId(rwgpsUserId);
  if (!isAws) {
    return getDatabase().prepare('DELETE FROM users WHERE rwgps_user_id = ?').run(userId).changes > 0;
  }
  await dynamoDb.send(new DeleteCommand({ TableName: userTable, Key: { rwgps_user_id: userId } }));
  return true;
}

function hasAccess(user) {
  return !!user && (user.role === 'admin' || (
    ['beta', 'active'].includes(user.status) && user.email_verified === 1
  ));
}

function isAdmin(user) {
  return !!user && user.role === 'admin';
}

module.exports = {
  findUserByRwgpsId, findUserByEmail, findUserByVerificationToken, createUser,
  updateUserEmail, verifyEmail, updateUserStatus, updateUserRole, updateUser,
  setEmailVerified, getAllUsers, deleteUser, hasAccess, isAdmin,
};
