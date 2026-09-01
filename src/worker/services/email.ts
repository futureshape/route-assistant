import type { Env } from '../types'

interface MailerSendPersonalization {
  email: string
  data: Record<string, string>
}

async function sendEmail(
  env: Env,
  to: string,
  toName: string,
  subject: string,
  templateId: string,
  personalization: MailerSendPersonalization[],
): Promise<boolean> {
  if (!env.MAILERSEND_API_KEY) {
    console.warn('[Email] MAILERSEND_API_KEY not configured, skipping email send')
    return false
  }

  const payload = {
    from: {
      email: env.MAILERSEND_FROM_EMAIL || 'noreply@route-assistant.com',
      name: env.MAILERSEND_FROM_NAME || 'Route Assistant',
    },
    to: [{ email: to, name: toName }],
    subject,
    template_id: templateId,
    personalization,
  }

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    console.error(`[Email] Mailersend API error: ${response.status}`)
    return false
  }

  return true
}

export async function sendEmailVerification(env: Env, email: string, verificationUrl: string, userName = ''): Promise<boolean> {
  const templateId = env.MAILERSEND_VERIFICATION_TEMPLATE_ID
  if (!templateId) {
    console.warn('[Email] MAILERSEND_VERIFICATION_TEMPLATE_ID not set, skipping')
    return false
  }

  try {
    const sent = await sendEmail(env, email, userName || email, 'Please verify your email address for Route Assistant', templateId, [
      { email, data: { user_name: userName || email, user_email: email, verification_url: verificationUrl } },
    ])
    if (sent) console.log(`[Email] Verification email sent to ${email}`)
    return sent
  } catch (err) {
    console.error('[Email] Failed to send verification email:', err)
    return false
  }
}

export async function sendBetaAccessNotification(env: Env, email: string, userName = '', status = 'beta'): Promise<boolean> {
  const templateId = env.MAILERSEND_BETA_ACCESS_TEMPLATE_ID
  if (!templateId || !email) {
    console.warn('[Email] Beta access template not configured or no email, skipping')
    return false
  }

  try {
    const sent = await sendEmail(env, email, userName || email, 'Your access to Route Assistant has been approved', templateId, [
      {
        email,
        data: { user_name: userName || email, user_email: email, access_level: status === 'active' ? 'full' : 'beta' },
      },
    ])
    if (sent) console.log(`[Email] Beta access notification sent to ${email}`)
    return sent
  } catch (err) {
    console.error('[Email] Failed to send beta access notification:', err)
    return false
  }
}
