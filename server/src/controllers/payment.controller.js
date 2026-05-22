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

  if (invoice.paymentStatus === 'Paid') {
    const quotation = await Quotation.findById(invoice.quotationId);
    if (quotation && quotation.status !== 'Paid') {
      await changeQuotationStatus({ quotation, status: 'Paid', user });
    }
  }

  return invoice;
}

function normalizePaymentPayload(payload) {
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
    paymentStageOrder: Number(payload.paymentStageOrder || 1)
  };
}

export async function listPayments(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    res.json(await Payment.find(query).populate('invoiceId quotationId clientId').sort({ paymentStageOrder: 1, paymentDate: -1 }));
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
      quotationId: invoice.quotationId,
      clientId: invoice.clientId
    });
    const updatedInvoice = await recalculateInvoicePayments(invoice._id, req.user);

    await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Payment Added', payment, adminRemarks: req.body.adminRemarks });
    if (payload.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Payment Paid', payment, adminRemarks: req.body.adminRemarks });
    }
    if (updatedInvoice.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: invoice.quotationId, invoiceId: invoice._id, stage: 'Final Payment Completed', payment, adminRemarks: req.body.adminRemarks });
    }

    res.status(201).json(await Payment.findById(payment._id).populate('invoiceId quotationId clientId'));
  } catch (err) { next(err); }
}

export async function updatePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const previousStatus = payment.paymentStatus || payment.status;
    const payload = normalizePaymentPayload({ ...payment.toObject(), ...req.body });
    Object.assign(payment, payload);
    await payment.save();
    const invoice = await recalculateInvoicePayments(payment.invoiceId, req.user);

    if (payload.paymentStatus === 'Paid' && previousStatus !== 'Paid') {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Payment Paid', payment, adminRemarks: req.body.adminRemarks });
    } else {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Payment Added', payment, adminRemarks: req.body.adminRemarks });
    }
    if (invoice.paymentStatus === 'Paid') {
      await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Final Payment Completed', payment, adminRemarks: req.body.adminRemarks });
    }

    res.json(await Payment.findById(payment._id).populate('invoiceId quotationId clientId'));
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
