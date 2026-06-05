import nodemailer from 'nodemailer';

const PLACEHOLDER_HOSTS = new Set(['smtp.example.com', 'example.com']);
const RESEND_API_URL = 'https://api.resend.com/emails';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

function mailboxDomain(value = '') {
  const match = String(value).match(/@([^>\s]+)/);
  return match ? match[1].toLowerCase() : '';
}

function fromDomain(value = '') {
  return mailboxDomain(value) || '<missing-domain>';
}

function namedEmail(name, email) {
  if (!email) return '';
  return name ? `${name} <${email}>` : email;
}

function resolveFromAddress() {
  return process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    process.env.MAIL_FROM ||
    namedEmail(process.env.EMAIL_FROM_NAME, process.env.EMAIL_FROM) ||
    process.env.SMTP_FROM ||
    process.env.MAIL_USER ||
    process.env.SMTP_USER;
}

function parseEmailAddress(value = '') {
  const match = String(value).match(/^(.*?)<([^>]+)>$/);
  if (!match) return { email: String(value).trim() };
  return {
    name: match[1].trim().replace(/^"|"$/g, ''),
    email: match[2].trim()
  };
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
  const rawHost = (process.env.MAIL_HOST || process.env.SMTP_HOST || '').trim();
  const user = (process.env.MAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;
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

  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = process.env.MAIL_SECURE === 'true' || port === 465;
  const timeout = Number(process.env.MAIL_TIMEOUT_MS || 10000);
  return { host, port, secure, user, pass, timeout };
}

function resolveSendGridApiKey() {
  return process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST === 'smtp.sendgrid.net' || process.env.MAIL_HOST === 'smtp.sendgrid.net'
      ? process.env.SMTP_PASS || process.env.MAIL_PASS
      : '');
}

function selectedProvider() {
  const explicit = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (explicit) return explicit;
  if (resolveSendGridApiKey()) return 'sendgrid';
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'smtp';
}

export function getEmailProviderStatus() {
  const provider = selectedProvider();
  return {
    provider,
    sendgridConfigured: Boolean(resolveSendGridApiKey()),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    smtpHost: process.env.MAIL_HOST || process.env.SMTP_HOST || '',
    from: resolveFromAddress() || ''
  };
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
    const provider = selectedProvider();
    if (provider === 'sendgrid') {
      console.log('[Mail] SendGrid API configured ✓');
      return true;
    }
    if (provider === 'resend') {
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

function buildSendGridAttachment(attachment) {
  const content = Buffer.isBuffer(attachment.content)
    ? attachment.content.toString('base64')
    : attachment.content;

  return {
    content,
    filename: attachment.filename,
    type: attachment.contentType || attachment.content_type || 'application/octet-stream',
    disposition: attachment.disposition || 'attachment'
  };
}

function normalizeRecipients(to) {
  const recipients = Array.isArray(to) ? to : String(to).split(',');
  return recipients
    .map((email) => String(email).trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

async function sendWithResend({ to, subject, text, html, attachments }) {
  const from = resolveFromAddress();
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
    const domain = fromDomain(from);
    const action = response.status === 403 || /domain.*verified|verify.*domain/i.test(message)
      ? ` Resend rejected RESEND_FROM because "${domain}" is not verified. Verify "${domain}" in Resend Domains or change RESEND_FROM to an address on a verified domain.`
      : '';
    throw new Error(`${message}${action}`);
  }

  return {
    provider: 'resend',
    accepted: Array.isArray(to) ? to : [to],
    rejected: [],
    messageId: payload.id,
    response: `Resend accepted message ${payload.id || ''}`.trim()
  };
}

async function sendWithSendGrid({ to, subject, text, html, attachments }) {
  const apiKey = resolveSendGridApiKey();
  const from = parseEmailAddress(resolveFromAddress());
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY or SMTP_PASS is required for SendGrid email delivery.');
  }
  if (!from.email) {
    throw new Error('EMAIL_FROM, SENDGRID_FROM, or MAIL_FROM is required for SendGrid email delivery.');
  }

  const content = [];
  if (text) content.push({ type: 'text/plain', value: text });
  if (html) content.push({ type: 'text/html', value: html });
  if (!content.length) content.push({ type: 'text/plain', value: '' });

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: normalizeRecipients(to) }],
      from,
      subject,
      content,
      attachments: attachments?.length
        ? attachments.map(buildSendGridAttachment)
        : undefined
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.errors?.map((error) => error.message).join('; ') ||
      payload.message ||
      `SendGrid API failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    provider: 'sendgrid',
    accepted: normalizeRecipients(to).map((recipient) => recipient.email),
    rejected: [],
    messageId: response.headers.get('x-message-id'),
    response: 'SendGrid accepted message'
  };
}

async function sendWithSmtp({ to, subject, text, html, attachments }) {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };
  return transporter.sendMail({
    from: resolveFromAddress(),
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
    const provider = selectedProvider();
    if (provider === 'sendgrid') {
      return sendWithSendGrid({ to, subject, text, html, attachments });
    }
    if (provider === 'resend') {
      return sendWithResend({ to, subject, text, html, attachments });
    }
    return sendWithSmtp({ to, subject, text, html, attachments });
  } catch (err) {
    console.error(`[Mail] Failed to send to ${to}:`, err.message);
    throw err;
  }
}
