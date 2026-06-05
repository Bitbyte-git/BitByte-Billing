import nodemailer from 'nodemailer';

export function createTransporter() {
  const host = process.env.MAIL_HOST;
  if (!host) return null;

  const port = Number(process.env.MAIL_PORT || 587);
  const secure = process.env.MAIL_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,                    // true for port 465 (SSL), false for 587 (STARTTLS)
    requireTLS: !secure,       // enforce STARTTLS upgrade on port 587
    auth: process.env.MAIL_USER
      ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      : undefined,
    tls: { rejectUnauthorized: false } // allow self-signed certs in dev
  });
}

export async function verifyTransporter() {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('[Mail] MAIL_HOST not set — email sending disabled.');
    return false;
  }
  try {
    await transporter.verify();
    console.log('[Mail] SMTP connection verified ✓');
    return true;
  } catch (err) {
    console.error('[Mail] SMTP connection FAILED:', err.message);
    return false;
  }
}

export async function sendNotificationEmail({ to, subject, text, html, attachments }) {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };
  try {
    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html,
      attachments
    });
    return result;
  } catch (err) {
    console.error(`[Mail] Failed to send to ${to}:`, err.message);
    throw err;
  }
}
