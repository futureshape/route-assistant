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
 * @param {string} verificationUrl - URL for email verification
 * @param {string} userName - User's name (optional)
 * @returns {Promise<void>}
 */
async function sendEmailVerification(email, verificationUrl, userName = '') {
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

    console.log(`Sending email verification to ${email} with template ${templateId}`);

    const personalization = [
      {
        email: email,
        data: {
          user_name: userName || email,
          user_email: email,
          verification_url: verificationUrl,
        },
      },
    ];

    const emailParams = new EmailParams()
      .setFrom(new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'hello@route-assistant.com',
        process.env.MAILERSEND_FROM_NAME || 'Route Assistant'
      ))
      .setTo([new Recipient(email, userName)])
      .setSubject('Please verify your email address for Route Assistant')
      .setTemplateId(templateId)
      .setPersonalization(personalization);

    const result = await mailerSend.email.send(emailParams);
    console.log(`✓ Email verification sent successfully to ${email}`);
    return result;
  } catch (error) {
    console.error('Failed to send email verification:');
    console.error('Error type:', typeof error);
    console.error('Error object:', error);
    
    if (error && error.message) {
      console.error('Error message:', error.message);
    }
    
    if (error && error.response) {
      console.error('MailerSend API response status:', error.response.status);
      console.error('MailerSend API response data:', error.response.data || error.response);
    }
    
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Don't throw - email failures shouldn't block the user flow
    // Return false to indicate failure
    return false;
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

    console.log(`Sending beta access notification to ${email} with template ${templateId}`);

    const emailParams = new EmailParams()
      .setFrom(new Sender(
        process.env.MAILERSEND_FROM_EMAIL || 'hello@route-assistant.com',
        process.env.MAILERSEND_FROM_NAME || 'Route Assistant'
      ))
      .setTo([new Recipient(email, userName)])
      .setSubject('Your access to Route Assistant has been approved')
      .setTemplateId(templateId)
      .setPersonalization([
        {
          email: email,
          data: {
            user_name: userName || email,
            user_email: email,
            access_level: status === 'active' ? 'full' : 'beta',
          },
        },
      ]);

    await mailerSend.email.send(emailParams);
    console.log(`✓ Beta access notification sent successfully to ${email} (status: ${status})`);
  } catch (error) {
    console.error('Failed to send beta access notification:');
    console.error('Error type:', typeof error);
    console.error('Error object:', error);
    
    if (error && error.message) {
      console.error('Error message:', error.message);
    }
    
    if (error && error.response) {
      console.error('MailerSend API response status:', error.response.status);
      console.error('MailerSend API response data:', error.response.data || error.response);
    }
    
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Don't throw - email failures shouldn't block the user flow
  }
}

module.exports = {
  isConfigured,
  sendEmailVerification,
  sendBetaAccessNotification,
};
