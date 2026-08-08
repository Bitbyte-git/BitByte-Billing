import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';
import { recordAudit } from '../services/workflowService.js';
import { createInvoiceForQuotation, emailInvoiceToClient } from '../services/invoiceService.js';
import { createInvoicePdfDocument } from '../utils/invoicePdf.js';

function publicInvoicePayload(invoice) {
  const items = (invoice.items || []).map((item) => ({
    service: item.service || '-',
    description: item.description || '',
    sacCode: item.sacCode || '-',
    quantity: item.quantity || 1,
    taxableValue: item.taxableValue || 0,
    cgstAmount: item.cgstAmount || 0,
    sgstAmount: item.sgstAmount || 0,
    igstAmount: item.igstAmount || 0,
    total: item.total || 0
  }));
  return {
    invoiceId: invoice.invoiceId || '-',
    clientName: invoice.clientId?.companyName || invoice.clientId?.fullName || 'Client',
    clientEmail: invoice.clientId?.email || '',
    clientPhone: invoice.clientId?.phone || '',
    quotationId: invoice.quotationId?.quotationId || '-',
    projectTitle: invoice.quotationId?.projectTitle || '-',
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    paymentStatus: invoice.paymentStatus || 'Pending',
    subtotal: invoice.subtotal || 0,
    discountedAmount: invoice.discountedAmount || 0,
    taxableAmount: invoice.finalSubtotal || invoice.subtotal || 0,
    gstAmount: invoice.gstAmount || 0,
    totalAmount: invoice.totalAmount || invoice.finalTotal || 0,
    amountPaid: invoice.amountPaid || 0,
    balanceDue: invoice.balanceDue || 0,
    payableAmount: Math.max(Number(invoice.balanceDue || 0), 0),
    items,
    status: invoice.invoiceId ? 'Verified' : 'Draft'
  };
}

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

export async function getPublicInvoice(req, res, next) {
  try {
    const clauses = [{ invoiceId: req.params.id }];
    if (mongoose.isValidObjectId(req.params.id)) clauses.push({ _id: req.params.id });
    const invoice = await Invoice.findOne({ $or: clauses }).populate('clientId quotationId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(publicInvoicePayload(invoice));
  } catch (err) { next(err); }
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
    const messages = {
      Sent: invoice.emailError ? `Invoice Sent Successfully. ${invoice.emailError}` : 'Invoice Sent Successfully',
      Skipped: 'Invoice email skipped because SMTP is not configured',
      Failed: invoice.emailError || 'Invoice email failed',
      Pending: 'Invoice email is pending'
    };
    res.json({ message: messages[invoice.emailDeliveryStatus] || 'Invoice email status updated', invoice });
  } catch (err) { next(err); }
}
