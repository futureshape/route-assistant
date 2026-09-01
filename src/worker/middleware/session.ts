import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import type { AppEnv, SessionData } from '../types'

const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const cookieId = getCookie(c, 'session_id')
  let session: SessionData = {}
  let sessionId = cookieId || ''
  let isNewSession = false

  if (sessionId) {
    const stored = await c.env.SESSIONS.get(sessionId, 'json')
    if (stored) {
      session = stored as SessionData
    } else {
      // Cookie present but KV entry expired — start a fresh session
      isNewSession = true
      sessionId = crypto.randomUUID()
    }
  } else {
    isNewSession = true
    sessionId = crypto.randomUUID()
  }

  c.set('session', session)
  c.set('sessionId', sessionId)

  await next()

  // Persist session after handler runs (only if it has content)
  const current = c.get('session')
  if (Object.keys(current).length > 0) {
    await c.env.SESSIONS.put(sessionId, JSON.stringify(current), { expirationTtl: SESSION_TTL })
    if (isNewSession) {
      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: SESSION_TTL,
      })
    }
  }
})

export async function destroySession(c: Parameters<typeof sessionMiddleware>[0]): Promise<void> {
  const sessionId = c.get('sessionId')
  if (sessionId) {
    await c.env.SESSIONS.delete(sessionId)
  }
  // Clear session data so the middleware doesn't re-save it
  c.set('session', {})
}
