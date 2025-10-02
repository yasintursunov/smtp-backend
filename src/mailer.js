const nodemailer = require('nodemailer');
const { Resend } = require('resend');

async function sendMailOrLog(to, url, subject) {
  const { RESEND_API_KEY, MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const html = `<a href="${url}">${url}</a>`;
  const from = MAIL_FROM || 'onboarding@resend.dev';

  // Resend Node SDK 
  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({ from, to, subject, html });
      console.log(`[MAIL:resend] sent to ${to} (${subject})`);
      return;
    } catch (err) {
      console.error('[MAIL:resend:error]', err?.message || err);
    
    }
  }
  //  SMTP
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const port = Number(SMTP_PORT || 587);
      const secure = port === 465;
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure, 
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({ from, to, subject, html, text: url });
      console.log(`[MAIL:smtp] sent to ${to} (${subject})`);
      return;
    } catch (err) {
      console.error('[MAIL:smtp:error]', err?.message || err);
    
    }
  }

  console.log(`[MAIL:console] ${subject} for ${to}: ${url}`);
}

const sendConfirmationMail = (to, url) => sendMailOrLog(to, url, 'Confirm your account');
const sendPasswordResetMail = (to, url) => sendMailOrLog(to, url, 'Reset your password');

module.exports = { sendConfirmationMail, sendPasswordResetMail };
