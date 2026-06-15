import InternInvoice from '../models/InternInvoice.js';
import { sendNotificationEmail } from '../utils/email.js';
import { internInvoicePdfBuffer } from '../utils/invoicePdf.js';
import { nextInternId, nextInternInvoiceId, nextInternPaymentId } from '../utils/idGenerator.js';

function clean(value) {
  return String(value || '').trim();
}

const INTERN_PAYMENT_ID_PATTERN = /^BBT-INT-PAY-\d{4}-\d{4}$/;

function isInternPaymentId(value) {
  return INTERN_PAYMENT_ID_PATTERN.test(clean(value));
}

export async function ensureInternPaymentId(invoice) {
  if (!isInternPaymentId(invoice.paymentId)) {
    invoice.paymentId = await nextInternPaymentId();
    await invoice.save();
  }
  return invoice;
}

export function normalizeInternInvoiceInput(body = {}) {
  const amount = Number(body.amount || 0);
  return {
    internId: clean(body.internId),
    employeeName: clean(body.employeeName),
    collegeName: clean(body.collegeName),
    courseMajor: clean(body.courseMajor || body.department),
    passedOut: clean(body.passedOut),
    address: clean(body.address),
    phone: clean(body.phone),
    email: clean(body.email).toLowerCase(),
    position: clean(body.position),
    duration: clean(body.duration),
    amount,
    paymentId: clean(body.paymentId),
    paymentReceived: body.paymentReceived === true || body.paymentStatus === 'Paid',
    termsAndConditions: clean(body.termsAndConditions) || 'This amount is not refundable. You can get it as a service from Bit Byte Technologies.'
  };
}

export function validateInternDraftPayload(payload) {
  const required = ['employeeName'];
  const missing = required.filter((field) => !payload[field]);
  if (missing.length) {
    throw Object.assign(new Error(`Missing required field: ${missing.join(', ')}`), { status: 422 });
  }
}

export function validateInternInvoicePayload(payload) {
  validateInternDraftPayload(payload);
  const required = ['address', 'phone', 'position', 'duration'];
  const missing = required.filter((field) => !payload[field]);
  if (missing.length) {
    throw Object.assign(new Error(`Missing required field: ${missing.join(', ')}`), { status: 422 });
  }
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 422 });
  }
  if (!payload.paymentReceived) {
    throw Object.assign(new Error('Payment must be marked received before generating an intern invoice'), { status: 422 });
  }
}

export async function createInternInvoice(body, user) {
  const payload = normalizeInternInvoiceInput(body);
  const isDraft = body.draft === true;
  if (isDraft) {
    validateInternDraftPayload(payload);
  } else {
    validateInternInvoicePayload(payload);
  }

  const invoice = await InternInvoice.create({
    ...payload,
    internId: payload.internId || await nextInternId(),
    invoiceId: isDraft ? undefined : await nextInternInvoiceId(),
    paymentId: isDraft
      ? payload.paymentId
      : isInternPaymentId(payload.paymentId)
        ? payload.paymentId
        : await nextInternPaymentId(),
    createdBy: user?._id
  });

  if (!isDraft && body.sendEmail !== false) {
    await emailInternInvoice(invoice._id);
  }

  return invoice;
}

export async function updateInternInvoice(invoiceId, body) {
  const existing = await InternInvoice.findById(invoiceId);
  if (!existing) throw Object.assign(new Error('Intern invoice not found'), { status: 404 });

  const payload = normalizeInternInvoiceInput(body);
  const shouldValidateInvoice = Boolean(existing.invoiceId || body.generateInvoice);
  if (shouldValidateInvoice) {
    validateInternInvoicePayload(payload);
  } else {
    validateInternDraftPayload(payload);
  }

  if (shouldValidateInvoice && !isInternPaymentId(payload.paymentId)) {
    payload.paymentId = isInternPaymentId(existing.paymentId)
      ? existing.paymentId
      : await nextInternPaymentId();
  }

  Object.assign(existing, payload);
  await existing.save();
  return existing.populate('createdBy', 'name email role');
}

export async function generateInternInvoiceDocument(invoiceId) {
  const invoice = await InternInvoice.findById(invoiceId).populate('createdBy', 'name email role');
  if (!invoice) throw Object.assign(new Error('Intern invoice not found'), { status: 404 });

  const payload = normalizeInternInvoiceInput(invoice.toObject());
  validateInternInvoicePayload(payload);

  if (!invoice.internId) invoice.internId = await nextInternId();
  if (!invoice.invoiceId) invoice.invoiceId = await nextInternInvoiceId();
  if (!isInternPaymentId(invoice.paymentId)) invoice.paymentId = await nextInternPaymentId();
  invoice.invoiceDate = new Date();
  await invoice.save();
  return invoice;
}

export async function emailInternInvoice(invoiceId) {
  const invoice = await InternInvoice.findById(invoiceId).populate('createdBy', 'name email');
  if (!invoice) throw Object.assign(new Error('Intern invoice not found'), { status: 404 });
  if (!invoice.invoiceId) {
    throw Object.assign(new Error('Generate the intern invoice before sending email'), { status: 422 });
  }
  await ensureInternPaymentId(invoice);

  try {
    if (!invoice.email) {
      invoice.emailDeliveryStatus = 'Skipped';
      invoice.emailError = 'Employee email address is missing.';
      await invoice.save();
      return invoice;
    }

    const pdf = await internInvoicePdfBuffer(invoice);
    const result = await sendNotificationEmail({
      to: invoice.email,
      subject: `Internship Invoice ${invoice.invoiceId} - Bit Byte Technologies`,
      text: `Dear ${invoice.employeeName},\n\nYour internship invoice ${invoice.invoiceId} is attached. Amount: Rs ${invoice.amount}.\n\nThank you,\nBit Byte Technologies`,
      attachments: [{ filename: `${invoice.invoiceId}.pdf`, content: pdf, contentType: 'application/pdf' }]
    });

    invoice.emailDeliveryStatus = result?.skipped ? 'Skipped' : 'Sent';
    invoice.sentAt = result?.skipped ? undefined : new Date();
    invoice.emailError = result?.provider
      ? `Delivered via ${result.provider}${result.messageId ? ` (${result.messageId})` : ''}`
      : '';
  } catch (err) {
    invoice.emailDeliveryStatus = 'Failed';
    invoice.emailError = err.message;
  }

  await invoice.save();
  return invoice;
}
