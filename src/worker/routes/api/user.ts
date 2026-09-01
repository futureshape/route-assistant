import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { requireAuth } from '../../middleware/auth'
import { findUserByRwgpsId, updateUserEmail, verifyEmail, findUserByVerificationToken } from '../../services/user'
import { sendEmailVerification } from '../../services/email'
import { randomHex } from '../../lib/utils'

const router = new Hono<AppEnv>()

router.post('/user/email', requireAuth, async (c) => {
  type EmailBody = { email?: string }
  const body = await c.req.json<EmailBody>().catch(() => ({} as EmailBody))
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!email) return c.json({ error: 'Valid email is required' }, 400)

  // Basic email validation
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    return c.json({ error: 'Invalid email format' }, 400)
  }
  const [local, domain] = email.split('@')
  if (!local || !domain || !domain.includes('.')) {
    return c.json({ error: 'Invalid email format' }, 400)
  }

  const session = c.get('session')
  const verificationToken = randomHex(32)
  const updatedUser = await updateUserEmail(c.env.DB, session.user!.rwgpsUserId, email, verificationToken)

  const url = new URL(c.req.url)
  const baseUrl = c.env.BASE_URL || `${url.protocol}//${url.host}`
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`

  await sendEmailVerification(c.env, email, verificationUrl).catch((err) => {
    console.error('[User] Failed to send verification email:', err)
  })

  session.user!.email = updatedUser.email
  session.user!.emailVerified = updatedUser.email_verified === 1
  session.user!.needsEmail = false

  return c.json({
    success: true,
    user: { email: updatedUser.email, emailVerified: updatedUser.email_verified === 1, status: updatedUser.status, role: updatedUser.role },
  })
})

router.get('/verify-email', async (c) => {
  const token = new URL(c.req.url).searchParams.get('token')
  if (!token) return c.json({ error: 'Verification token is required' }, 400)

  const existing = await findUserByVerificationToken(c.env.DB, token)
  if (!existing) {
    return c.json(
      { error: 'Invalid or expired verification token', message: 'This link may have already been used or expired.' },
      400,
    )
  }

  if (existing.email_verified) {
    return c.json({ success: true, message: 'Email already verified', alreadyVerified: true })
  }

  const verifiedUser = await verifyEmail(c.env.DB, token)
  if (!verifiedUser) return c.json({ error: 'Failed to verify email' }, 400)

  // Update session if the verified user is currently logged in
  const session = c.get('session')
  if (session.user?.rwgpsUserId === verifiedUser.rwgps_user_id) {
    session.user.emailVerified = true
  }

  return c.json({ success: true, message: 'Email verified successfully', user: { email: verifiedUser.email, emailVerified: true } })
})

router.post('/resend-verification', async (c) => {
  const session = c.get('session')
  if (!session.user) return c.json({ error: 'Not authenticated' }, 401)

  const dbUser = await findUserByRwgpsId(c.env.DB, session.user.rwgpsUserId)
  if (!dbUser) return c.json({ error: 'User not found' }, 404)
  if (dbUser.email_verified) return c.json({ success: true, message: 'Email already verified' })
  if (!dbUser.email) return c.json({ error: 'No email address on file' }, 400)
  if (!dbUser.email_verification_token) return c.json({ error: 'No verification token found. Submit your email again.' }, 400)

  const url = new URL(c.req.url)
  const baseUrl = c.env.BASE_URL || `${url.protocol}//${url.host}`
  const verificationUrl = `${baseUrl}/verify-email?token=${dbUser.email_verification_token}`

  await sendEmailVerification(c.env, dbUser.email, verificationUrl)
  return c.json({ success: true, message: 'Verification email sent' })
})

export { router as userRoutes }
