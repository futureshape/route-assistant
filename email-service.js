const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

/**
 * Email Service - Handles email notifications using Mailersend
 * 
 * Assumes email templates are set up in Mailersend with the following template IDs:
 * - Email verification template
 * - Beta access approval template
 * 
 * Template variables will be passed to Mailersend for personalization.
 */

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

/**
 * Check if email service is configured
 */
function isConfigured() {
  return !!process.env.MAILERSEND_API_KEY;
}

/**
 * Send email verification to user
 * @param {string} email - User's email address
 * @param {string} userName - User's name (optional)
 * @returns {Promise<void>}
 */
async function sendEmailVerification(email, userName = '') {
  if (!isConfigured()) {
    console.warn('Email service not configured. Skipping email verification send.');
    return;
  }

  try {
    // Template ID should be configured in Mailersend dashboard
    // This is a placeholder - actual template ID should be set via environment variable
    const templateId = process.env.MAILERSEND_VERIFICATION_TEMPLATE_ID;
    
    if (!templateId) {
      console.warn('Email verification template ID not configured. Skipping email send.');
      return;
    }

    const emailParams = new EmailParams()
      .setFrom(new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'noreply@routeassistant.app',
        process.env.MAILERSEND_FROM_NAME || 'Route Assistant'
      ))
      .setTo([new Recipient(email, userName)])
      .setTemplateId(templateId)
      .setVariables([
        {
          email: email,
          substitutions: [
            {
              var: 'user_name',
              value: userName || email,
            },
            {
              var: 'user_email',
              value: email,
            },
          ],
        },
      ]);

    await mailerSend.email.send(emailParams);
    console.log(`Email verification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send email verification:', error.message);
    // Don't throw - email failures shouldn't block the user flow
  }
}

/**
 * Send beta access approval notification to user
 * @param {string} email - User's email address
 * @param {string} userName - User's name (optional)
 * @param {string} status - New status (beta or active)
 * @returns {Promise<void>}
 */
async function sendBetaAccessNotification(email, userName = '', status = 'beta') {
  if (!isConfigured()) {
    console.warn('Email service not configured. Skipping beta access notification.');
    return;
  }

  if (!email) {
    console.warn('No email address provided. Skipping beta access notification.');
    return;
  }

  try {
    // Template ID should be configured in Mailersend dashboard
    const templateId = process.env.MAILERSEND_BETA_ACCESS_TEMPLATE_ID;
    
    if (!templateId) {
      console.warn('Beta access template ID not configured. Skipping email send.');
      return;
    }

    const emailParams = new EmailParams()
      .setFrom(new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'noreply@routeassistant.app',
        process.env.MAILERSEND_FROM_NAME || 'Route Assistant'
      ))
      .setTo([new Recipient(email, userName)])
      .setTemplateId(templateId)
      .setVariables([
        {
          email: email,
          substitutions: [
            {
              var: 'user_name',
              value: userName || email,
            },
            {
              var: 'user_email',
              value: email,
            },
            {
              var: 'access_level',
              value: status === 'active' ? 'full' : 'beta',
            },
          ],
        },
      ]);

    await mailerSend.email.send(emailParams);
    console.log(`Beta access notification sent to ${email} (status: ${status})`);
  } catch (error) {
    console.error('Failed to send beta access notification:', error.message);
    // Don't throw - email failures shouldn't block the user flow
  }
}

module.exports = {
  isConfigured,
  sendEmailVerification,
  sendBetaAccessNotification,
};
