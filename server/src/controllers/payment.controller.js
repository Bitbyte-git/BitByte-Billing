import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';
import { changeQuotationStatus } from '../services/workflowService.js';
import { sendClientWorkflowEmail } from '../utils/clientEmail.js';
import { nextPaymentId } from '../utils/idGenerator.js';

const PAID_STATUSES = ['Paid', 'Partial'];

async function recalculateInvoicePayments(invoiceId, user) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });

  const payments = await Payment.find({ invoiceId: invoice._id });
  const amountPaid = payments
    .filter((payment) => PAID_STATUSES.includes(payment.paymentStatus || payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  invoice.amountPaid = Math.min(amountPaid, Number(invoice.totalAmount || 0));
  invoice.balanceDue = Math.max(Number(invoice.totalAmount || 0) - invoice.amountPaid, 0);
  invoice.paymentStatus = invoice.balanceDue === 0
    ? 'Paid'
    : invoice.amountPaid > 0
      ? 'Partial'
      : 'Pending';
  await invoice.save();

  const quotation = await Quotation.findById(invoice.quotationId);
  if (quotation) {
    const targetStatus = invoice.paymentStatus === 'Paid' ? 'Paid' : 'Invoice Generated';
    if (quotation.status !== targetStatus && ['Approved', 'Invoice Generated', 'Paid'].includes(quotation.status)) {
      await changeQuotationStatus({ quotation, status: targetStatus, user });
    }
  }

  return invoice;
}

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function parseAttachment(payload, existing = null) {
  if (payload.clearAttachment) {
    return { attachmentFileName: '', attachmentMimeType: '', attachmentData: '' };
  }
  if (!payload.attachmentData) {
    if (existing) {
      return {
        attachmentFileName: existing.attachmentFileName || '',
        attachmentMimeType: existing.attachmentMimeType || '',
        attachmentData: existing.attachmentData || ''
      };
    }
    return { attachmentFileName: '', attachmentMimeType: '', attachmentData: '' };
  }
  const raw = String(payload.attachmentData);
  const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
  const bytes = Buffer.byteLength(base64, 'base64');
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw Object.assign(new Error('Payment attachment must be 2MB or smaller'), { status: 422 });
  }
  return {
    attachmentFileName: payload.attachmentFileName || 'attachment',
    attachmentMimeType: payload.attachmentMimeType || 'application/octet-stream',
    attachmentData: base64
  };
}

function normalizePaymentPayload(payload, existing = null) {
  const paymentStatus = payload.paymentStatus || payload.status || 'Pending';
  return {
    paymentLabel: payload.paymentLabel || 'Payment',
    amount: Number(payload.amount || 0),
    paymentStatus,
    status: paymentStatus,
    paymentMethod: payload.paymentMethod || 'Pending',
    paymentDate: payload.paymentDate || undefined,
    transactionReference: payload.transactionReference || '',
    notes: payload.notes || '',
    paymentStageOrder: Number(payload.paymentStageOrder || 1),
    ...parseAttachment(payload, existing)
  };
}

export async function listPayments(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    const payments = await Payment.find(query)
      .select('-attachmentData')
      .populate('invoiceId quotationId clientId')
      .sort({ paymentStageOrder: 1, paymentDate: -1 });
    res.json(payments.map((payment) => ({
      ...payment.toObject(),
      hasAttachment: Boolean(payment.attachmentFileName)
    })));
  } catch (err) { next(err); }
}

export async function createPayment(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.body.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const existingCount = await Payment.countDocuments({ invoiceId: invoice._id });
    const payload = normalizePaymentPayload({ ...req.body, paymentStageOrder: req.body.paymentStageOrder || existingCount + 1 });
    const payment = await Payment.create({
      ...payload,
      paymentId: await nextPaymentId(),
      invoiceId: invoice._id,
      quotationId: invoice.quotationId,
      clientId: invoice.clientId
    });
    const updatedInvoice = await recalculateInvoicePayments(invoice._id, req.user);

    await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Payment Added', payment });
    if (payload.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Payment Paid', payment });
    }
    if (updatedInvoice.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Final Payment Completed', payment });
    }

    res.status(201).json(await Payment.findById(payment._id).populate('invoiceId quotationId clientId'));
  } catch (err) { next(err); }
}

export async function updatePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const previousStatus = payment.paymentStatus || payment.status;
    const payload = normalizePaymentPayload({ ...payment.toObject(), ...req.body }, payment);
    Object.assign(payment, payload);
    await payment.save();
    const invoice = await recalculateInvoicePayments(payment.invoiceId, req.user);

    if (payload.paymentStatus === 'Paid' && previousStatus !== 'Paid') {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Payment Paid', payment });
    } else {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Payment Added', payment });
    }
    if (invoice.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Final Payment Completed', payment });
    }

    res.json(await Payment.findById(payment._id).populate('invoiceId quotationId clientId'));
  } catch (err) { next(err); }
}

export async function downloadPaymentAttachment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment?.attachmentData) return res.status(404).json({ message: 'No attachment found for this payment' });
    const buffer = Buffer.from(payment.attachmentData, 'base64');
    res.setHeader('Content-Type', payment.attachmentMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${payment.attachmentFileName || 'payment-attachment'}"`);
    res.send(buffer);
  } catch (err) { next(err); }
}

export async function deletePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const invoiceId = payment.invoiceId;
    await payment.deleteOne();
    await recalculateInvoicePayments(invoiceId, req.user);
    res.json({ message: 'Payment stage deleted' });
  } catch (err) { next(err); }
}
