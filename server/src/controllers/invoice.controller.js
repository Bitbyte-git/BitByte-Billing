import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import { changeQuotationStatus, recordAudit } from '../services/workflowService.js';
import { nextInvoiceId } from '../utils/idGenerator.js';

export async function listInvoices(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = client ? { clientId: client._id } : {};
    res.json(await Invoice.find(query).populate('clientId quotationId').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
}

export async function getInvoice(req, res, next) {
  try { res.json(await Invoice.findById(req.params.id).populate('clientId quotationId')); } catch (err) { next(err); }
}

export async function generateInvoice(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.quotationId).populate('servicesSelected');
    if (!quotation || quotation.status !== 'Approved') throw Object.assign(new Error('Only approved quotations can generate invoices'), { status: 422 });
    const items = await QuotationItem.find({ quotationId: quotation._id }).populate('serviceId');
    const invoice = await Invoice.create({
      invoiceId: await nextInvoiceId(),
      quotationId: quotation._id,
      clientId: quotation.clientId,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      items: items.map((item) => ({ serviceId: item.serviceId, service: item.serviceId?.name, description: item.description, amount: item.estimatedCost, gstPercentage: item.gstPercentage, total: item.total })),
      subtotal: quotation.subtotal,
      gstAmount: quotation.gstAmount,
      totalAmount: quotation.totalAmount,
      balanceDue: quotation.totalAmount
    });
    await changeQuotationStatus({ quotation, status: 'Invoice Generated', user: req.user });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
}

export function invoicePdf(req, res) {
  res.json({ message: `PDF generation endpoint ready for invoice ${req.params.id}. Integrate pdfmake stream or persisted pdfUrl here.` });
}

export async function sendInvoiceEmail(req, res, next) {
  try {
    await recordAudit({ userId: req.user._id, action: 'Invoice email sent', entityType: 'Invoice', entityId: req.params.id, newValue: { sent: true } });
    res.json({ message: 'Invoice email queued' });
  } catch (err) { next(err); }
}
