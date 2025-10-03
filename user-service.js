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
function updateUserEmail(rwgpsUserId, email) {
  const userId = validateUserId(rwgpsUserId);
  
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET email = ?, updated_at = datetime('now')
    WHERE rwgps_user_id = ?
  `);
  
  stmt.run(email, userId);
  return findUserByRwgpsId(userId);
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
 * Check if user has access to the app
 */
function hasAccess(user) {
  if (!user) return false;
  // Users with 'beta', 'active', or 'admin' role have access
  // 'waitlist' and 'inactive' do not have access
  return ['beta', 'active'].includes(user.status) || user.role === 'admin';
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
  createUser,
  updateUserEmail,
  updateUserStatus,
  updateUserRole,
  getAllUsers,
  updateUser,
  hasAccess,
  isAdmin
};
