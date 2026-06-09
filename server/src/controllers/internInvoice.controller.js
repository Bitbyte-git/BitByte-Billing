import InternInvoice from '../models/InternInvoice.js';
import {
  createInternInvoice as createInternInvoiceDocument,
  emailInternInvoice,
  generateInternInvoiceDocument,
  updateInternInvoice
} from '../services/internInvoiceService.js';
import { syncGoogleFormInterns } from '../services/googleFormInternService.js';
import { recordAudit } from '../services/workflowService.js';
import { createInternInvoicePdfDocument } from '../utils/invoicePdf.js';

export async function listInternInvoices(_req, res, next) {
  try {
    res.json(await InternInvoice.find().populate('createdBy', 'name email role').sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
}

export async function getInternInvoice(req, res, next) {
  try {
    const invoice = await InternInvoice.findById(req.params.id).populate('createdBy', 'name email role');
    if (!invoice) return res.status(404).json({ message: 'Intern invoice not found' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function createInternInvoiceRecord(req, res, next) {
  try {
    const invoice = await createInternInvoiceDocument(req.body, req.user);
    await recordAudit({
      userId: req.user._id,
      action: invoice.invoiceId ? 'Intern invoice generated' : 'Intern details saved',
      entityType: 'InternInvoice',
      entityId: invoice._id,
      newValue: { internId: invoice.internId, invoiceId: invoice.invoiceId, employeeName: invoice.employeeName, amount: invoice.amount }
    });
    res.status(201).json(await InternInvoice.findById(invoice._id).populate('createdBy', 'name email role'));
  } catch (err) {
    next(err);
  }
}

export async function updateInternInvoiceRecord(req, res, next) {
  try {
    const invoice = await updateInternInvoice(req.params.id, req.body);
    await recordAudit({
      userId: req.user._id,
      action: 'Intern invoice updated',
      entityType: 'InternInvoice',
      entityId: invoice._id,
      newValue: { internId: invoice.internId, invoiceId: invoice.invoiceId, employeeName: invoice.employeeName, amount: invoice.amount }
    });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function generateInternInvoice(req, res, next) {
  try {
    const invoice = await generateInternInvoiceDocument(req.params.id);
    await recordAudit({
      userId: req.user._id,
      action: 'Intern invoice generated',
      entityType: 'InternInvoice',
      entityId: invoice._id,
      newValue: { internId: invoice.internId, invoiceId: invoice.invoiceId, employeeName: invoice.employeeName, amount: invoice.amount }
    });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function syncGoogleFormInternRecords(req, res, next) {
  try {
    const { summary, auditEntityId } = await syncGoogleFormInterns();
    if (auditEntityId) {
      await recordAudit({
        userId: req.user._id,
        action: 'Google Form interns synced',
        entityType: 'InternInvoice',
        entityId: auditEntityId,
        newValue: summary
      });
    }
    res.json({ message: 'Google Form responses synced successfully.', summary });
  } catch (err) {
    next(err);
  }
}

export async function internInvoicePdf(req, res, next) {
  try {
    const invoice = await InternInvoice.findById(req.params.id).populate('createdBy', 'name email role');
    if (!invoice) return res.status(404).json({ message: 'Intern invoice not found' });

    const pdfDoc = createInternInvoicePdfDocument(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceId}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    next(err);
  }
}

export async function sendInternInvoiceEmail(req, res, next) {
  try {
    const invoice = await emailInternInvoice(req.params.id);
    await recordAudit({
      userId: req.user._id,
      action: 'Intern invoice email sent',
      entityType: 'InternInvoice',
      entityId: req.params.id,
      newValue: { status: invoice.emailDeliveryStatus, sentAt: invoice.sentAt }
    });
    const messages = {
      Sent: 'Intern invoice sent successfully.',
      Skipped: invoice.emailError || 'Intern invoice email skipped.',
      Failed: invoice.emailError || 'Intern invoice email failed.',
      Pending: 'Intern invoice email is pending.'
    };
    res.json({ message: messages[invoice.emailDeliveryStatus] || 'Intern invoice email status updated.', invoice });
  } catch (err) {
    next(err);
  }
}

export async function deleteInternInvoice(req, res, next) {
  try {
    const invoice = await InternInvoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Intern invoice not found' });
    await recordAudit({
      userId: req.user._id,
      action: 'Intern invoice deleted',
      entityType: 'InternInvoice',
      entityId: invoice._id,
      oldValue: { invoiceId: invoice.invoiceId, employeeName: invoice.employeeName, amount: invoice.amount }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
