import nodemailer from 'nodemailer';

const PLACEHOLDER_HOSTS = new Set(['smtp.example.com', 'example.com']);
const RESEND_API_URL = 'https://api.resend.com/emails';

function mailboxDomain(value = '') {
  const match = String(value).match(/@([^>\s]+)/);
  return match ? match[1].toLowerCase() : '';
}

function inferSmtpHost(user = '') {
  const domain = mailboxDomain(user);
  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    return 'smtp.gmail.com';
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'office365.com'].includes(domain)) {
    return 'smtp.office365.com';
  }
  return '';
}

function resolveMailConfig() {
  const rawHost = (process.env.MAIL_HOST || '').trim();
  const user = (process.env.MAIL_USER || '').trim();
  const pass = process.env.MAIL_PASS;
  const inferredHost = inferSmtpHost(user);
  const host = !rawHost || PLACEHOLDER_HOSTS.has(rawHost.toLowerCase())
    ? inferredHost
    : rawHost;

  if (!host) {
    return null;
  }
  if (PLACEHOLDER_HOSTS.has(rawHost.toLowerCase()) && !inferredHost) {
    throw new Error('MAIL_HOST is still a placeholder. Set it to your real SMTP host.');
  }
  if (user && !pass) {
    throw new Error('MAIL_PASS is required when MAIL_USER is configured.');
  }

  const port = Number(process.env.MAIL_PORT || 587);
  const secure = process.env.MAIL_SECURE === 'true' || port === 465;
  const timeout = Number(process.env.MAIL_TIMEOUT_MS || 10000);
  return { host, port, secure, user, pass, timeout };
}

export function createTransporter() {
  const config = resolveMailConfig();
  if (!config) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,                    // true for port 465 (SSL), false for 587 (STARTTLS)
    requireTLS: !config.secure,               // enforce STARTTLS upgrade on port 587
    connectionTimeout: config.timeout,
    greetingTimeout: config.timeout,
    socketTimeout: config.timeout,
    auth: config.user
      ? { user: config.user, pass: config.pass }
      : undefined,
    tls: { rejectUnauthorized: false } // allow self-signed certs in dev
  });
}

export async function verifyTransporter() {
  try {
    if (process.env.RESEND_API_KEY) {
      console.log('[Mail] Resend API configured ✓');
      return true;
    }
    const transporter = createTransporter();
    if (!transporter) {
      console.log('[Mail] MAIL_HOST not set and no SMTP host could be inferred — email sending disabled.');
      return false;
    }
    await transporter.verify();
    console.log('[Mail] SMTP connection verified ✓');
    return true;
  } catch (err) {
    console.error('[Mail] SMTP connection FAILED:', err.message);
    return false;
  }
}

function buildResendAttachment(attachment) {
  const content = Buffer.isBuffer(attachment.content)
    ? attachment.content.toString('base64')
    : attachment.content;

  return {
    filename: attachment.filename,
    content,
    content_type: attachment.contentType || attachment.content_type
  };
}

async function sendWithResend({ to, subject, text, html, attachments }) {
  const from = process.env.RESEND_FROM || process.env.MAIL_FROM || process.env.MAIL_USER;
  if (!from) {
    throw new Error('RESEND_FROM or MAIL_FROM is required for Resend email delivery.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
      attachments: attachments?.length
        ? attachments.map(buildResendAttachment)
        : undefined
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || payload.error || `Resend API failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    provider: 'resend',
    accepted: Array.isArray(to) ? to : [to],
    rejected: [],
    messageId: payload.id,
    response: `Resend accepted message ${payload.id || ''}`.trim()
  };
}

async function sendWithSmtp({ to, subject, text, html, attachments }) {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text,
    html,
    attachments
  });
}

export async function sendNotificationEmail({ to, subject, text, html, attachments }) {
  try {
    if (!to) {
      throw new Error('Recipient email address is required.');
    }
    return process.env.RESEND_API_KEY
      ? sendWithResend({ to, subject, text, html, attachments })
      : sendWithSmtp({ to, subject, text, html, attachments });
  } catch (err) {
    console.error(`[Mail] Failed to send to ${to}:`, err.message);
    throw err;
  }
}
