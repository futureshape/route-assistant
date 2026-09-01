import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { requireAdmin } from '../../middleware/auth'
import { getAllUsers, updateUser } from '../../services/user'
import { sendBetaAccessNotification } from '../../services/email'
import { findUserByRwgpsId } from '../../services/user'

const router = new Hono<AppEnv>()

router.get('/admin/users', requireAdmin, async (c) => {
  const users = await getAllUsers(c.env.DB)
  return c.json({ users })
})

router.patch('/admin/users/:rwgpsUserId', requireAdmin, async (c) => {
  const rwgpsUserId = parseInt(c.req.param('rwgpsUserId'), 10)
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))

  const currentUser = await findUserByRwgpsId(c.env.DB, rwgpsUserId)
  const oldStatus = currentUser?.status

  const updatedUser = await updateUser(c.env.DB, rwgpsUserId, body)

  // Send beta access notification when promoting from waitlist
  const newStatus = updatedUser.status
  if (oldStatus === 'waitlist' && (newStatus === 'beta' || newStatus === 'active') && updatedUser.email) {
    await sendBetaAccessNotification(c.env, updatedUser.email, '', newStatus).catch((err) => {
      console.error('[Admin] Failed to send beta access notification:', err)
    })
  }

  return c.json({ success: true, user: updatedUser })
})

export { router as adminRoutes }
