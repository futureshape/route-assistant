import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'
import { findUserByRwgpsId, hasAccess, isAdmin } from '../services/user'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session')
  if (!session.rwgps?.access_token) {
    return c.json({ error: 'Not authenticated' }, 401)
  }
  return next()
})

export const requireAccess = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session')
  if (!session.user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const dbUser = await findUserByRwgpsId(c.env.DB, session.user.rwgpsUserId)
  if (!dbUser || !hasAccess(dbUser)) {
    let message = 'Access to this application is restricted.'
    if (dbUser?.status === 'waitlist') {
      message = 'Your account is on the waitlist. You will be notified when access is granted.'
    } else if (dbUser?.email && !dbUser.email_verified && ['beta', 'active'].includes(dbUser.status)) {
      message = 'Please verify your email address to access the application.'
    }
    return c.json({ error: 'Access denied', status: dbUser?.status || 'unknown', emailVerified: dbUser?.email_verified || false, message }, 403)
  }

  // Keep session in sync with latest DB values
  session.user.status = dbUser.status
  session.user.role = dbUser.role
  session.user.email = dbUser.email
  session.user.emailVerified = dbUser.email_verified === 1

  return next()
})

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session')
  if (!session.user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }
  const dbUser = await findUserByRwgpsId(c.env.DB, session.user.rwgpsUserId)
  if (!dbUser || !isAdmin(dbUser)) {
    return c.json({ error: 'Admin access required' }, 403)
  }
  return next()
})
