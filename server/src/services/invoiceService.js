import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import { changeQuotationStatus } from './workflowService.js';
import { nextInvoiceId, nextPaymentId } from '../utils/idGenerator.js';
import { sendClientWorkflowEmail } from '../utils/clientEmail.js';
import { sendNotificationEmail } from '../utils/email.js';
import { buildInvoiceLineFromQuotationItem, invoicePdfBuffer } from '../utils/invoicePdf.js';

export async function createInitialPaymentStage(invoice) {
  const existing = await Payment.countDocuments({ invoiceId: invoice._id });
  if (existing > 0) return null;

  return Payment.create({
    paymentId: await nextPaymentId(),
    invoiceId: invoice._id,
    quotationId: invoice.quotationId,
    clientId: invoice.clientId,
    paymentLabel: 'Payment 1',
    paymentStageOrder: 1,
    amount: Number(invoice.totalAmount || invoice.finalTotal || 0),
    paymentMethod: 'Pending',
    status: 'Pending',
    paymentStatus: 'Pending'
  });
}

export async function createInvoiceForQuotation(quotationId, user, options = {}) {
  const existing = await Invoice.findOne({ quotationId });
  if (existing) {
    await createInitialPaymentStage(existing);
    const quotation = await Quotation.findById(quotationId);
    if (quotation && ['Approved', 'Invoice Generated'].includes(quotation.status)) {
      const targetStatus = existing.paymentStatus === 'Paid' ? 'Paid' : 'Invoice Generated';
      if (quotation.status !== targetStatus) {
        await changeQuotationStatus({ quotation, status: targetStatus, user });
      }
    }
    return existing;
  }

  const quotation = await Quotation.findById(quotationId).populate('servicesSelected clientId');
  if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 });
  if (!['Approved', 'Invoice Generated', 'Paid'].includes(quotation.status)) {
    throw Object.assign(new Error('Only approved quotations can generate invoices'), { status: 422 });
  }

  const items = await QuotationItem.find({ quotationId: quotation._id }).populate('serviceId');
  const baseSubtotal = Number(quotation.subtotal || 0);
  const discountType = options.discountType || quotation.finalDiscountType || 'None';
  const rawDiscountValue = Math.max(Number(options.discountValue ?? quotation.finalDiscountValue ?? 0), 0);
  const discountValue = discountType === 'Percentage' ? Math.min(rawDiscountValue, 100) : rawDiscountValue;
  const discountedAmount = discountType === 'Percentage'
    ? baseSubtotal * discountValue / 100
    : discountType === 'Fixed Amount'
      ? Math.min(discountValue, baseSubtotal)
      : 0;
  const finalSubtotal = Math.max(baseSubtotal - discountedAmount, 0);
  const gstRate = baseSubtotal ? Number(quotation.gstAmount || 0) / baseSubtotal : 0;
  const finalGst = finalSubtotal * gstRate;
  const finalTotal = finalSubtotal + finalGst;

  const invoice = await Invoice.create({
    invoiceId: await nextInvoiceId(),
    quotationId: quotation._id,
    clientId: quotation.clientId,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    items: items.map((item) => buildInvoiceLineFromQuotationItem(item)),
    subtotal: baseSubtotal,
    discountType,
    discountValue,
    discountedAmount,
    finalSubtotal,
    gstAmount: finalGst,
    finalTotal,
    totalAmount: finalTotal,
    balanceDue: finalTotal
  });

  if (options.sendEmail !== false) {
    await emailInvoiceToClient(invoice._id);
  }

  if (quotation.status === 'Approved') {
    await changeQuotationStatus({ quotation, status: 'Invoice Generated', user });
    await sendClientWorkflowEmail({ quotationId: quotation._id, invoiceId: invoice._id, stage: 'Invoice Generated' });
  }

  await createInitialPaymentStage(invoice);
  return invoice;
}

async function emailInvoiceToClient(invoiceId) {
  const invoice = await Invoice.findById(invoiceId).populate('clientId quotationId');
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });
  try {
    const pdf = await invoicePdfBuffer(invoice);
    const result = await sendNotificationEmail({
      to: invoice.clientId.email,
      subject: `Invoice ${invoice.invoiceId} - Bit Byte Technologies`,
      text: `Dear ${invoice.clientId.fullName || invoice.clientId.companyName},\n\nYour invoice ${invoice.invoiceId} is attached. Total amount: Rs ${invoice.totalAmount}.\n\nThank you,\nBit Byte Technologies`,
      attachments: [{ filename: `${invoice.invoiceId}.pdf`, content: pdf, contentType: 'application/pdf' }]
    });
    invoice.emailDeliveryStatus = result?.skipped ? 'Skipped' : 'Sent';
    invoice.sentAt = result?.skipped ? undefined : new Date();
    invoice.emailError = '';
  } catch (err) {
    invoice.emailDeliveryStatus = 'Failed';
    invoice.emailError = err.message;
  }
  await invoice.save();
  return invoice;
}

