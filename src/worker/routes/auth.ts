import { Hono } from 'hono'
import type { AppEnv, SessionUser } from '../types'
import { findUserByRwgpsId, createUser } from '../services/user'

const auth = new Hono<AppEnv>()

auth.get('/ridewithgps', (c) => {
  const url = new URL(c.req.url)
  const redirectUri = c.env.RWGPS_REDIRECT_URI || `${url.protocol}//${url.host}/auth/ridewithgps/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: c.env.RWGPS_CLIENT_ID,
    redirect_uri: redirectUri,
  })
  return c.redirect(`https://ridewithgps.com/oauth/authorize?${params}`)
})

auth.get('/ridewithgps/callback', async (c) => {
  const code = new URL(c.req.url).searchParams.get('code')
  if (!code) return c.text('Missing code', 400)

  const url = new URL(c.req.url)
  const redirectUri = c.env.RWGPS_REDIRECT_URI || `${url.protocol}//${url.host}/auth/ridewithgps/callback`

  // Attempt 1: client credentials in body
  let tokenData: { access_token?: string; token_type?: string; scope?: string } | null = null
  try {
    const r1 = await fetch('https://ridewithgps.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: c.env.RWGPS_CLIENT_ID, client_secret: c.env.RWGPS_CLIENT_SECRET, redirect_uri: redirectUri }),
    })
    if (r1.ok) tokenData = await r1.json()
  } catch (e) {
    console.error('[OAuth] Token exchange attempt 1 failed:', e)
  }

  // Attempt 2: HTTP Basic auth fallback
  if (!tokenData?.access_token) {
    try {
      const credentials = btoa(`${c.env.RWGPS_CLIENT_ID}:${c.env.RWGPS_CLIENT_SECRET}`)
      const r2 = await fetch('https://ridewithgps.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      })
      if (r2.ok) tokenData = await r2.json()
    } catch (e) {
      console.error('[OAuth] Token exchange attempt 2 (Basic auth) failed:', e)
    }
  }

  if (!tokenData?.access_token) {
    console.error('[OAuth] Token exchange failed: no access_token returned')
    return c.text('OAuth token exchange failed', 500)
  }

  // Fetch RideWithGPS user info
  const userRes = await fetch('https://ridewithgps.com/api/v1/users/current.json', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
  })
  if (!userRes.ok) {
    console.error(`[OAuth] Failed to fetch user info: ${userRes.status}`)
    return c.text('Failed to fetch user info from RideWithGPS', 500)
  }

  const rwgpsData = (await userRes.json()) as { user: { id: number; name: string; email?: string } }
  const rwgpsUser = rwgpsData.user
  const rwgpsUserId = parseInt(String(rwgpsUser.id), 10)
  if (!Number.isInteger(rwgpsUserId) || rwgpsUserId <= 0) {
    return c.text('Invalid user ID from RideWithGPS', 400)
  }

  let dbUser = await findUserByRwgpsId(c.env.DB, rwgpsUserId)
  if (!dbUser) {
    dbUser = await createUser(c.env.DB, rwgpsUserId, null, 'waitlist', 'user')
  }

  console.log(`[OAuth] User ${rwgpsUserId} (${rwgpsUser.name}): status=${dbUser.status}, role=${dbUser.role}`)

  const session = c.get('session')
  session.rwgps = { access_token: tokenData.access_token, token_type: tokenData.token_type || 'Bearer', scope: tokenData.scope, created_at: Date.now() }
  session.user = {
    dbId: dbUser.id,
    rwgpsUserId: dbUser.rwgps_user_id,
    name: rwgpsUser.name,
    email: dbUser.email,
    emailVerified: dbUser.email_verified === 1,
    status: dbUser.status,
    role: dbUser.role,
    needsEmail: !dbUser.email,
  }

  return c.redirect('/')
})

// Test-mode endpoint — enables E2E tests to authenticate without real OAuth
auth.get('/test', async (c) => {
  if (c.env.TEST_MODE !== 'true') return c.text('Not found', 404)

  const testToken = c.env.TEST_OAUTH_TOKEN
  if (!testToken) return c.text('TEST_OAUTH_TOKEN not configured', 500)

  const userRes = await fetch('https://ridewithgps.com/api/v1/users/current.json', {
    headers: { Authorization: `Bearer ${testToken}`, Accept: 'application/json' },
  })
  if (!userRes.ok) return c.text('Failed to fetch user with test token', 500)

  const rwgpsData = (await userRes.json()) as { user: { id: number; name: string; email?: string } }
  const rwgpsUser = rwgpsData.user

  let dbUser = await findUserByRwgpsId(c.env.DB, rwgpsUser.id)
  if (!dbUser) {
    dbUser = await createUser(c.env.DB, rwgpsUser.id, rwgpsUser.email || null, 'active', 'user')
  }

  // Auto-verify email for test users
  if (!dbUser.email_verified) {
    await c.env.DB.prepare(`UPDATE users SET email_verified = 1 WHERE rwgps_user_id = ?`).bind(rwgpsUser.id).run()
    dbUser = (await findUserByRwgpsId(c.env.DB, rwgpsUser.id))!
  }

  const session = c.get('session')
  session.rwgps = { access_token: testToken, token_type: 'Bearer', scope: 'read', created_at: Date.now() }
  session.user = {
    dbId: dbUser.id,
    rwgpsUserId: dbUser.rwgps_user_id,
    name: rwgpsUser.name,
    email: dbUser.email,
    emailVerified: dbUser.email_verified === 1,
    status: dbUser.status,
    role: dbUser.role,
  } satisfies SessionUser

  console.log(`[TestMode] Authenticated as ${rwgpsUser.name} (ID: ${rwgpsUser.id})`)
  return c.redirect('/')
})

export { auth as authRoutes }
