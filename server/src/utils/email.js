import nodemailer from 'nodemailer';

export function createTransporter() {
  if (!process.env.MAIL_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined
  });
}

export async function sendNotificationEmail({ to, subject, text, html, attachments }) {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };
  return transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html, attachments });
}
