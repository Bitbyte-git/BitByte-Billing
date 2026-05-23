import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { recordAudit } from '../services/workflowService.js';
import { createInvoiceForQuotation } from '../services/invoiceService.js';
import { sendNotificationEmail } from '../utils/email.js';
import { createInvoicePdfDocument, invoicePdfBuffer } from '../utils/invoicePdf.js';

export async function listInvoices(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    if (req.query.quotationId) query.quotationId = req.query.quotationId;
    res.json(await Invoice.find(query).populate('clientId quotationId').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
}

export async function getInvoice(req, res, next) {
  try { res.json(await Invoice.findById(req.params.id).populate('clientId quotationId')); } catch (err) { next(err); }
}

export async function generateInvoice(req, res, next) {
  try {
    const invoice = await createInvoiceForQuotation(req.params.quotationId, req.user, {
      discountType: req.body.discountType,
      discountValue: req.body.discountValue
    });
    res.status(201).json(await Invoice.findById(invoice._id).populate('clientId quotationId'));
  } catch (err) { next(err); }
}

export async function invoicePdf(req, res, next) {
  try {
    if (req.user.role === 'Client') {
      return res.status(403).json({ message: 'PDF download not allowed for clients' });
    }
    const invoice = await Invoice.findById(req.params.id).populate('clientId quotationId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const pdfDoc = createInvoicePdfDocument(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceId}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    next(err);
  }
}

export async function sendInvoiceEmail(req, res, next) {
  try {
    const invoice = await emailInvoiceToClient(req.params.id);
    await recordAudit({ userId: req.user._id, action: 'Invoice email sent', entityType: 'Invoice', entityId: req.params.id, newValue: { status: invoice.emailDeliveryStatus, sentAt: invoice.sentAt } });
    res.json({ message: invoice.emailDeliveryStatus === 'Sent' ? 'Invoice Sent Successfully' : 'Invoice email skipped', invoice });
  } catch (err) { next(err); }
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
