import type { D1Database } from '@cloudflare/workers-types'
import type { DbUser } from '../types'

function validateUserId(rwgpsUserId: unknown): number {
  const id = parseInt(String(rwgpsUserId), 10)
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid rwgpsUserId: ${rwgpsUserId}`)
  return id
}

export async function findUserByRwgpsId(db: D1Database, rwgpsUserId: unknown): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE rwgps_user_id = ?').bind(validateUserId(rwgpsUserId)).first<DbUser>()
}

export async function findUserByEmail(db: D1Database, email: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<DbUser>()
}

export async function findUserByVerificationToken(db: D1Database, token: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE email_verification_token = ?').bind(token).first<DbUser>()
}

export async function createUser(
  db: D1Database,
  rwgpsUserId: unknown,
  email: string | null = null,
  status = 'waitlist',
  role = 'user',
): Promise<DbUser> {
  const id = validateUserId(rwgpsUserId)
  await db.prepare('INSERT INTO users (rwgps_user_id, email, status, role) VALUES (?, ?, ?, ?)').bind(id, email, status, role).run()
  return (await findUserByRwgpsId(db, id))!
}

export async function updateUserEmail(
  db: D1Database,
  rwgpsUserId: unknown,
  email: string,
  verificationToken: string | null = null,
): Promise<DbUser> {
  const id = validateUserId(rwgpsUserId)
  await db
    .prepare(`UPDATE users SET email = ?, email_verified = 0, email_verification_token = ?, updated_at = datetime('now') WHERE rwgps_user_id = ?`)
    .bind(email, verificationToken, id)
    .run()
  return (await findUserByRwgpsId(db, id))!
}

export async function verifyEmail(db: D1Database, token: string): Promise<DbUser | null> {
  const user = await findUserByVerificationToken(db, token)
  if (!user) return null
  if (user.email_verified) return user
  await db
    .prepare(`UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = datetime('now') WHERE email_verification_token = ?`)
    .bind(token)
    .run()
  return findUserByRwgpsId(db, user.rwgps_user_id)
}

export async function updateUserStatus(db: D1Database, rwgpsUserId: unknown, status: string): Promise<DbUser> {
  const id = validateUserId(rwgpsUserId)
  await db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE rwgps_user_id = ?`).bind(status, id).run()
  return (await findUserByRwgpsId(db, id))!
}

export async function updateUserRole(db: D1Database, rwgpsUserId: unknown, role: string): Promise<DbUser> {
  const id = validateUserId(rwgpsUserId)
  await db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE rwgps_user_id = ?`).bind(role, id).run()
  return (await findUserByRwgpsId(db, id))!
}

export async function getAllUsers(db: D1Database): Promise<DbUser[]> {
  const result = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all<DbUser>()
  return result.results
}

export async function updateUser(db: D1Database, rwgpsUserId: unknown, updates: Record<string, unknown>): Promise<DbUser> {
  const id = validateUserId(rwgpsUserId)
  const allowed = ['email', 'status', 'role']
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (fields.length > 0) {
    fields.push(`updated_at = datetime('now')`)
    values.push(id)
    await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE rwgps_user_id = ?`).bind(...values).run()
  }
  return (await findUserByRwgpsId(db, id))!
}

export async function deleteUser(db: D1Database, rwgpsUserId: unknown): Promise<boolean> {
  const id = validateUserId(rwgpsUserId)
  const result = await db.prepare('DELETE FROM users WHERE rwgps_user_id = ?').bind(id).run()
  return result.meta.changes > 0
}

export function hasAccess(user: DbUser): boolean {
  if (isAdmin(user)) return true
  const approved = user.status === 'beta' || user.status === 'active'
  return approved && user.email_verified === 1
}

export function isAdmin(user: DbUser): boolean {
  return user.role === 'admin'
}
