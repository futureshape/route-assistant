const Database = require('better-sqlite3');
const path = require('path');

// Database file path - stored in the project root
const DB_PATH = path.join(__dirname, 'route-assistant.db');

// Initialize database connection
let db = null;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH, { verbose: console.log });
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rwgps_user_id INTEGER NOT NULL UNIQUE,
      email TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verification_token TEXT,
      status TEXT NOT NULL DEFAULT 'waitlist',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create index on rwgps_user_id for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_rwgps_user_id 
    ON users(rwgps_user_id);
  `);

  // Create index on email for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email 
    ON users(email);
  `);

  // Create index on status for filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_status 
    ON users(status);
  `);

  // Migration: Add email verification columns if they don't exist
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('[DB] Added email_verified column');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN email_verification_token TEXT;
    `);
    console.log('[DB] Added email_verification_token column');
  } catch (e) {
    // Column already exists, ignore
  }

  console.log('[DB] Database schema initialized');
}

// Close database connection
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase,
  DB_PATH
};
