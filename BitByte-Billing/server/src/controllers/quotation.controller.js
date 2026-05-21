import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import Remark from '../models/Remark.js';
import { nextQuotationId } from '../utils/idGenerator.js';
import { changeQuotationStatus, recordAudit } from '../services/workflowService.js';

export async function listQuotations(req, res, next) {
  try {
    const query = req.user.role === 'Client' ? { createdBy: req.user._id } : {};
    res.json(await Quotation.find(query).populate('clientId').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
}

export async function getQuotation(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('clientId');
    if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 });
    res.json(quotation);
  } catch (err) { next(err); }
}

export async function createQuotation(req, res, next) {
  try {
    if (!req.body.mainService) throw Object.assign(new Error('Main service must be selected'), { status: 422 });
    if (!req.body.projectTitle) throw Object.assign(new Error('Project title is required'), { status: 422 });
    if (!req.body.requirementDetails) throw Object.assign(new Error('Requirement details are required'), { status: 422 });

    // Find or create client record for this user
    const Client = (await import('../models/Client.js')).default;
    let client = await Client.findOne({ email: req.user.email });
    if (!client) {
      client = await Client.create({
        clientId: `BBT-CL-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        fullName: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        registeredBy: req.user._id
      });
    }

    const quotation = await Quotation.create({
      ...req.body,
      quotationId: await nextQuotationId(),
      createdBy: req.user._id,
      clientId: client._id,
      status: 'Submitted',
      submittedAt: new Date()
    });
    await recordAudit({ userId: req.user._id, action: 'Quotation submitted', entityType: 'Quotation', entityId: quotation._id, newValue: quotation.toObject() });
    res.status(201).json(quotation);
  } catch (err) { next(err); }
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
