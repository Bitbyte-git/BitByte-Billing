import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import Remark from '../models/Remark.js';
import { nextQuotationId } from '../utils/idGenerator.js';
import { changeQuotationStatus, recordAudit } from '../services/workflowService.js';

export async function listQuotations(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? { $or: [{ createdBy: req.user._id }, ...(client ? [{ clientId: client._id }] : [])] } : {};
    res.json(await Quotation.find(query).populate('clientId servicesSelected').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
}

export async function getQuotation(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('clientId servicesSelected');
    if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 });
    res.json(quotation);
  } catch (err) { next(err); }
}

export async function createQuotation(req, res, next) {
  try {
    if (!req.body.servicesSelected?.length) throw Object.assign(new Error('At least one service must be selected'), { status: 422 });
    const clientId = req.body.clientId || (await resolveClientId(req));
    const quotation = await Quotation.create({
      ...req.body,
      clientId,
      quotationId: await nextQuotationId(),
      createdBy: req.user._id,
      status: 'Submitted',
      submittedAt: new Date()
    });
    await recordAudit({ userId: req.user._id, action: 'Quotation submitted', entityType: 'Quotation', entityId: quotation._id, newValue: quotation.toObject() });
    res.status(201).json(quotation);
  } catch (err) { next(err); }
}

async function resolveClientId(req) {
  if (req.user.role !== 'Client') {
    if (!req.body.clientId) throw Object.assign(new Error('Client is required'), { status: 422 });
    return req.body.clientId;
  }

  let client = await Client.findOne({ email: req.user.email });
  if (!client) {
    if (!req.user.phone) throw Object.assign(new Error('A client profile with phone number is required before submitting quotations'), { status: 422 });
    client = await Client.create({
      clientId: `AUTO-${req.user._id.toString().slice(-8).toUpperCase()}`,
      fullName: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      registeredBy: req.user._id
    });
  }
  return client._id;
}

export async function updateQuotation(req, res, next) {
  try {
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(quotation);
  } catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    res.json(await changeQuotationStatus({ quotation, status: req.body.status, user: req.user }));
  } catch (err) { next(err); }
}

export async function addRemark(req, res, next) {
  try {
    res.status(201).json(await Remark.create({ quotationId: req.params.id, addedBy: req.user._id, role: req.user.role, message: req.body.message }));
  } catch (err) { next(err); }
}

export async function addCosting(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    const items = await QuotationItem.deleteMany({ quotationId: quotation._id }).then(() => QuotationItem.insertMany(req.body.items.map((item) => ({
      ...item,
      quotationId: quotation._id,
      total: Number(item.estimatedCost) * (1 + Number(item.gstPercentage || 0) / 100)
    }))));
    const subtotal = items.reduce((sum, item) => sum + item.estimatedCost, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    quotation.subtotal = subtotal;
    quotation.gstAmount = totalAmount - subtotal;
    quotation.totalAmount = totalAmount;
    quotation.accountantRemarks = req.body.accountantRemarks;
    await quotation.save();
    await recordAudit({ userId: req.user._id, action: 'Accountant added costing', entityType: 'Quotation', entityId: quotation._id, newValue: { subtotal, totalAmount } });
    res.json({ quotation, items });
  } catch (err) { next(err); }
}

export async function clarification(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    quotation.accountantRemarks = req.body.message;
    await quotation.save();
    res.json(await changeQuotationStatus({ quotation, status: 'Needs Clarification', user: req.user, message: req.body.message }));
  } catch (err) { next(err); }
}

export async function forwardToAdmin(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    res.json(await changeQuotationStatus({ quotation, status: 'Forwarded to Admin', user: req.user }));
  } catch (err) { next(err); }
}

export async function approve(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    quotation.adminRemarks = req.body.adminRemarks;
    await quotation.save();
    res.json(await changeQuotationStatus({ quotation, status: 'Approved', user: req.user }));
  } catch (err) { next(err); }
}

export async function reject(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    quotation.adminRemarks = req.body.adminRemarks;
    await quotation.save();
    res.json(await changeQuotationStatus({ quotation, status: 'Rejected', user: req.user }));
  } catch (err) { next(err); }
}
