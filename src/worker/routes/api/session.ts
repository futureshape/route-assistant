import { Hono } from 'hono'
import { deleteCookie } from 'hono/cookie'
import type { AppEnv } from '../../types'
import { findUserByRwgpsId } from '../../services/user'
import { destroySession } from '../../middleware/session'
import { randomHex } from '../../lib/utils'

const router = new Hono<AppEnv>()

router.get('/session', async (c) => {
  const session = c.get('session')
  if (!session.rwgps?.access_token) {
    return c.json({ authenticated: false })
  }

  // Refresh user data from DB to surface any admin-made changes
  if (session.user?.rwgpsUserId) {
    const dbUser = await findUserByRwgpsId(c.env.DB, session.user.rwgpsUserId)
    if (dbUser) {
      session.user.status = dbUser.status
      session.user.role = dbUser.role
      session.user.email = dbUser.email
      session.user.emailVerified = dbUser.email_verified === 1
    }
  }

  return c.json({ authenticated: true, user: session.user ?? null })
})

router.post('/logout', async (c) => {
  await destroySession(c)
  deleteCookie(c, 'session_id', { path: '/' })
  return c.json({ success: true })
})

router.get('/csrf-token', async (c) => {
  const session = c.get('session')
  if (!session.csrfToken) {
    session.csrfToken = randomHex(32)
  }
  return c.json({ csrfToken: session.csrfToken })
})

export { router as sessionRoutes }
