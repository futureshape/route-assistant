import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

// Validates X-CSRF-Token header against session-stored token for state-changing requests
export const csrfMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return next()
  }

  const session = c.get('session')
  // Accept both cases since HTTP headers are case-insensitive
  const token = c.req.header('x-csrf-token') || c.req.header('X-CSRF-Token')

  if (!session.csrfToken || !token || token !== session.csrfToken) {
    return c.json({ error: 'Invalid CSRF token' }, 403)
  }

  return next()
})
