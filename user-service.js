const { getDatabase } = require('./db');
const emailService = require('./email-service');

/**
 * User Service - Database operations for user management
 * 
 * Note: rwgps_user_id is stored as INTEGER in database.
 * SQLite verbose logging may show .0 suffix but actual storage is integer.
 * All functions validate input to ensure integer values.
 * 
 * User status values:
 * - 'waitlist': User has signed up but not approved yet
 * - 'beta': Beta tester with full access
 * - 'active': Regular active user (for future use)
 * - 'inactive': User account disabled
 * 
 * User roles:
 * - 'user': Regular user
 * - 'admin': Administrator with access to admin features
 */

/**
 * Validate and convert rwgpsUserId to integer
 * @param {any} rwgpsUserId - The user ID to validate
 * @returns {number} - Valid integer user ID
 * @throws {Error} - If user ID is invalid
 */
function validateUserId(rwgpsUserId) {
  const userId = parseInt(rwgpsUserId, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(`Invalid rwgpsUserId: ${rwgpsUserId}`);
  }
  return userId;
}

/**
 * Find a user by RideWithGPS user ID
 */
function findUserByRwgpsId(rwgpsUserId) {
  const userId = validateUserId(rwgpsUserId);
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE rwgps_user_id = ?');
  return stmt.get(userId);
}

/**
 * Find a user by email
 */
function findUserByEmail(email) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

/**
 * Create a new user
 */
function createUser(rwgpsUserId, email = null, status = 'waitlist', role = 'user') {
  const userId = validateUserId(rwgpsUserId);
  
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (rwgps_user_id, email, status, role)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(userId, email, status, role);
  return findUserByRwgpsId(userId);
}

/**
 * Update user email
 */
function updateUserEmail(rwgpsUserId, email, verificationToken = null) {
  const userId = validateUserId(rwgpsUserId);
  
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET email = ?, email_verified = 0, email_verification_token = ?, updated_at = datetime('now')
    WHERE rwgps_user_id = ?
  `);
  
  stmt.run(email, verificationToken, userId);
  return findUserByRwgpsId(userId);
}

/**
 * Verify user email with token
 */
function verifyEmail(token) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET email_verified = 1, email_verification_token = NULL, updated_at = datetime('now')
    WHERE email_verification_token = ?
  `);
  
  const result = stmt.run(token);
  
  if (result.changes === 0) {
    return null; // Token not found or already verified
  }
  
  // Return the updated user
  const user = db.prepare('SELECT * FROM users WHERE email_verified = 1 AND email_verification_token IS NULL ORDER BY updated_at DESC LIMIT 1').get();
  return user;
}

/**
 * Find user by verification token
 */
function findUserByVerificationToken(token) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email_verification_token = ?');
  return stmt.get(token);
}

/**
 * Update user status
 */
function updateUserStatus(rwgpsUserId, status) {
  const userId = validateUserId(rwgpsUserId);
  
  // Get current user to check old status
  const currentUser = findUserByRwgpsId(userId);
  const oldStatus = currentUser?.status;
  
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET status = ?, updated_at = datetime('now')
    WHERE rwgps_user_id = ?
  `);
  
  stmt.run(status, userId);
  const updatedUser = findUserByRwgpsId(userId);
  
  // Send notification email if status changed from 'waitlist' to 'beta' or 'active'
  if (oldStatus === 'waitlist' && (status === 'beta' || status === 'active')) {
    if (updatedUser.email) {
      emailService.sendBetaAccessNotification(updatedUser.email, '', status)
        .catch(err => console.error('Failed to send beta access notification:', err));
    }
  }
  
  return updatedUser;
}

/**
 * Update user role
 */
function updateUserRole(rwgpsUserId, role) {
  const userId = validateUserId(rwgpsUserId);
  
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET role = ?, updated_at = datetime('now')
    WHERE rwgps_user_id = ?
  `);
  
  stmt.run(role, userId);
  return findUserByRwgpsId(userId);
}

/**
 * Get all users (for admin)
 */
function getAllUsers() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Update user (for admin)
 */
function updateUser(rwgpsUserId, updates) {
  const userId = validateUserId(rwgpsUserId);
  
  // Get current user to check old status
  const currentUser = findUserByRwgpsId(userId);
  const oldStatus = currentUser?.status;
  
  const db = getDatabase();
  const allowedFields = ['email', 'status', 'role'];
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) {
    return findUserByRwgpsId(userId);
  }
  
  fields.push('updated_at = datetime(\'now\')');
  values.push(userId);
  
  const stmt = db.prepare(`
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE rwgps_user_id = ?
  `);
  
  stmt.run(...values);
  const updatedUser = findUserByRwgpsId(userId);
  
  // Send notification email if status changed from 'waitlist' to 'beta' or 'active'
  if (updates.status && oldStatus === 'waitlist' && (updates.status === 'beta' || updates.status === 'active')) {
    if (updatedUser.email) {
      emailService.sendBetaAccessNotification(updatedUser.email, '', updates.status)
        .catch(err => console.error('Failed to send beta access notification:', err));
    }
  }
  
  return updatedUser;
}

/**
 * Delete a user (for testing purposes)
 */
function deleteUser(rwgpsUserId) {
  const userId = validateUserId(rwgpsUserId);
  
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM users WHERE rwgps_user_id = ?');
  const result = stmt.run(userId);
  
  return result.changes > 0;
}

/**
 * Check if user has access to the app
 */
function hasAccess(user) {
  if (!user) return false;
  // Admins always have access regardless of email verification
  if (user.role === 'admin') return true;
  // Regular users need approved status (beta/active) AND verified email
  return ['beta', 'active'].includes(user.status) && user.email_verified === 1;
}

/**
 * Check if user is admin
 */
function isAdmin(user) {
  if (!user) return false;
  return user.role === 'admin';
}

module.exports = {
  findUserByRwgpsId,
  findUserByEmail,
  findUserByVerificationToken,
  createUser,
  updateUserEmail,
  verifyEmail,
  updateUserStatus,
  updateUserRole,
  getAllUsers,
  updateUser,
  deleteUser,
  hasAccess,
  isAdmin
};
