import InternInvoice from '../models/InternInvoice.js';
import { sendNotificationEmail } from '../utils/email.js';
import { internInvoicePdfBuffer } from '../utils/invoicePdf.js';
import { nextInternInvoiceId } from '../utils/idGenerator.js';

function clean(value) {
  return String(value || '').trim();
}

export function normalizeInternInvoiceInput(body = {}) {
  const amount = Number(body.amount || 0);
  return {
    employeeName: clean(body.employeeName),
    collegeName: clean(body.collegeName),
    address: clean(body.address),
    phone: clean(body.phone),
    email: clean(body.email).toLowerCase(),
    position: clean(body.position),
    duration: clean(body.duration),
    amount,
    paymentReceived: body.paymentReceived !== false,
    termsAndConditions: clean(body.termsAndConditions) || undefined
  };
}

export function validateInternInvoicePayload(payload) {
  const required = ['employeeName', 'address', 'phone', 'position', 'duration'];
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
  validateInternInvoicePayload(payload);

  const invoice = await InternInvoice.create({
    invoiceId: await nextInternInvoiceId(),
    ...payload,
    createdBy: user?._id
  });

  if (body.sendEmail !== false) {
    await emailInternInvoice(invoice._id);
  }

  return invoice;
}

export async function emailInternInvoice(invoiceId) {
  const invoice = await InternInvoice.findById(invoiceId).populate('createdBy', 'name email');
  if (!invoice) throw Object.assign(new Error('Intern invoice not found'), { status: 404 });

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
