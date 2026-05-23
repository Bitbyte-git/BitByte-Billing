import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import Remark from '../models/Remark.js';
import User from '../models/User.js';
import { nextQuotationId } from '../utils/idGenerator.js';
import { priceMap } from '../utils/priceList.js';
import { sendNotificationEmail } from '../utils/email.js';
import { sendClientWorkflowEmail } from '../utils/clientEmail.js';
import { changeQuotationStatus, recordAudit, notifyRole } from '../services/workflowService.js';
import { createInvoiceForQuotation } from '../services/invoiceService.js';

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
    console.log('CreateQuotation payload:', req.body);
  if (!req.body.mainService?.length && !req.body.servicesSelected?.length) throw Object.assign(new Error('At least one service must be selected'), { status: 422 });
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
  } catch (err) { console.error('CreateQuotation error:', err); next(err); }
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
    const quotation = await Quotation.findById(req.params.id).populate('clientId');
    if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 });
    if (!req.body.items?.length) throw Object.assign(new Error('At least one pricing item is required'), { status: 422 });

    await QuotationItem.deleteMany({ quotationId: quotation._id });

    const items = req.body.items.map((item) => {
      const subService = item.subService || item.subServiceName || item.mainService;
      const mainService = item.mainService;
      const hasAutoPrice = Object.prototype.hasOwnProperty.call(priceMap, subService);
      const basePrice = Number(item.basePrice || 0);
      const quantity = Number(item.quantity || 1);
      const discountPercentage = Number(item.discountPercentage || 0);
      const gstPercentage = Number(item.gstPercentage || 0);
      const lineBase = basePrice * quantity;
      const discountAmount = lineBase * discountPercentage / 100;
      const taxableAmount = lineBase - discountAmount;
      const gstAmount = taxableAmount * gstPercentage / 100;
      const totalAmount = taxableAmount + gstAmount;
      if (!mainService) throw Object.assign(new Error('Main service is required for every pricing item'), { status: 422 });
      if (!subService) throw Object.assign(new Error('Sub-service is required for every pricing item'), { status: 422 });
      if (!Number.isFinite(basePrice) || basePrice < 0) throw Object.assign(new Error(`Invalid price for ${subService}`), { status: 422 });
      if (!Number.isFinite(quantity) || quantity < 1) throw Object.assign(new Error(`Invalid quantity for ${subService}`), { status: 422 });
      if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 20) {
        throw Object.assign(new Error(`Discount for ${subService} must be between 0% and 20%`), { status: 422 });
      }
      return {
        quotationId: quotation._id,
        serviceId: item.serviceId || undefined,
        mainService,
        subService,
        subServiceName: subService,
        description: item.description || '',
        basePrice,
        quantity,
        discountPercentage,
        discountAmount,
        gstPercentage,
        gstAmount,
        totalAmount,
        priceType: hasAutoPrice && basePrice === Number(priceMap[subService]) ? 'Auto' : 'Manual',
        addedByAccountant: req.user._id,
        addedByAccountantName: req.user.name || req.user.email || 'Accountant',
        pricingAddedAt: new Date()
      };
    });

    const insertedItems = await QuotationItem.insertMany(items);

    // Recalculate totals for quotation
    const subtotal = insertedItems.reduce((sum, i) => sum + (i.basePrice * i.quantity) - (i.discountAmount || 0), 0);
    const totalGst = insertedItems.reduce((sum, i) => sum + i.gstAmount, 0);
    const totalAmount = subtotal + totalGst;
    quotation.subtotal = subtotal;
    quotation.gstAmount = totalGst;
    quotation.totalAmount = totalAmount;
    quotation.costingItems = insertedItems.map((item) => ({
      serviceId: item.serviceId,
      mainService: item.mainService,
      subService: item.subService,
      subServiceName: item.subServiceName,
      description: item.description,
      basePrice: item.basePrice,
      quantity: item.quantity,
      discountPercentage: item.discountPercentage,
      discountAmount: item.discountAmount,
      gstPercentage: item.gstPercentage,
      gstAmount: item.gstAmount,
      totalAmount: item.totalAmount,
      priceType: item.priceType,
      addedByAccountant: item.addedByAccountant,
      addedByAccountantName: item.addedByAccountantName,
      pricingAddedAt: item.pricingAddedAt
    }));
    await quotation.save();

    // Record audit and notify admin via email
    await recordAudit({
      userId: req.user._id,
      action: 'Accountant added costing',
      entityType: 'Quotation',
      entityId: quotation._id,
      newValue: { subtotal, totalAmount }
    });
    await sendPricingEmailToAdmins({ quotation, items: insertedItems });

    res.json({ quotation, items: insertedItems });
  } catch (err) {
    next(err);
  }
}

export async function clarification(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    res.json(await changeQuotationStatus({ quotation, status: 'Needs Clarification', user: req.user, message: req.body.message }));
  } catch (err) { next(err); }
}

export async function forwardToAdmin(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('clientId');
    if (!quotation) throw Object.assign(new Error('Quotation not found'), { status: 404 });
    const items = await QuotationItem.find({ quotationId: quotation._id });
    const selectedSubServices = quotation.subServices || [];
    const hasEverySelectedSubService = selectedSubServices.length
      ? selectedSubServices.every((subService) => items.some((item) => (item.subService || item.subServiceName) === subService && Number(item.basePrice) > 0))
      : items.length > 0 && items.every((item) => Number(item.basePrice) > 0);

    if (!hasEverySelectedSubService) {
      throw Object.assign(new Error('Every selected sub-service must have a price before forwarding to admin'), { status: 422 });
    }

    const updated = await changeQuotationStatus({ quotation, status: 'Forwarded to Admin', user: req.user });
    await sendPricingEmailToAdmins({ quotation: updated, items });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function approve(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    quotation.adminRemarks = req.body.adminRemarks;
    quotation.finalDiscountType = req.body.discountType || req.body.finalDiscountType || 'None';
    const rawDiscountValue = Math.max(Number(req.body.discountValue ?? req.body.finalDiscountValue ?? 0), 0);
    quotation.finalDiscountValue = quotation.finalDiscountType === 'Percentage' ? Math.min(rawDiscountValue, 100) : rawDiscountValue;
    const subtotal = Number(quotation.subtotal || 0);
    quotation.finalDiscountAmount = quotation.finalDiscountType === 'Percentage'
      ? subtotal * quotation.finalDiscountValue / 100
      : quotation.finalDiscountType === 'Fixed Amount'
        ? Math.min(quotation.finalDiscountValue, subtotal)
        : 0;
    await quotation.save();
    const updated = await changeQuotationStatus({ quotation, status: 'Approved', user: req.user });
    try {
      await createInvoiceForQuotation(updated._id, req.user);
    } catch (invoiceErr) {
      console.error('Auto invoice generation after approval failed:', invoiceErr.message);
    }
    if (req.body.adminRemarks?.trim()) {
      await notifyRole({
        role: 'Accountant',
        title: `Admin remarks on ${updated.quotationId}`,
        message: req.body.adminRemarks.trim(),
        type: 'Quotation'
      });
    }
    await sendClientWorkflowEmail({ quotationId: updated._id, stage: 'Quotation Approved' });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function reject(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    quotation.adminRemarks = req.body.adminRemarks;
    await quotation.save();
    const updated = await changeQuotationStatus({ quotation, status: 'Rejected', user: req.user });
    if (req.body.adminRemarks?.trim()) {
      await notifyRole({
        role: 'Accountant',
        title: `Admin remarks on ${updated.quotationId}`,
        message: req.body.adminRemarks.trim(),
        type: 'Quotation'
      });
    }
    await sendClientWorkflowEmail({ quotationId: updated._id, stage: 'Quotation Rejected' });
    res.json(updated);
  } catch (err) { next(err); }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function adminReviewUrl() {
  const baseUrl = process.env.CLIENT_URL || process.env.APP_URL || '';
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/admin/approvals` : '/admin/approvals';
}

function buildPricingEmail({ quotation, items }) {
  const clientName = quotation.clientId?.companyName || quotation.clientId?.fullName || 'Client';
  const mainService = (quotation.mainService || []).join(', ') || '-';
  const selectedSubServices = items.map((item) => item.subService || item.subServiceName).filter(Boolean).join(', ') || '-';
  const reviewUrl = adminReviewUrl();
  const text = [
    'Quotation Pricing Added - Review Required',
    '',
    `Quotation ID: ${quotation.quotationId}`,
    `Client Name: ${clientName}`,
    `Main Service: ${mainService}`,
    `Selected Sub-Services: ${selectedSubServices}`,
    `Total Amount: ${formatCurrency(quotation.totalAmount)}`,
    `Review quotation in Admin panel: ${reviewUrl}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 12px">Quotation Pricing Added - Review Required</h2>
      <p><strong>Quotation ID:</strong> ${quotation.quotationId}</p>
      <p><strong>Client Name:</strong> ${clientName}</p>
      <p><strong>Main Service:</strong> ${mainService}</p>
      <p><strong>Selected Sub-Services:</strong> ${selectedSubServices}</p>
      <p><strong>Total Amount:</strong> ${formatCurrency(quotation.totalAmount)}</p>
      <p><a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">Review quotation in Admin panel</a></p>
    </div>
  `;

  return { text, html };
}

async function sendPricingEmailToAdmins({ quotation, items }) {
  try {
    const admins = await User.find({ role: 'Admin', status: 'Active' });
    if (!admins.length) return;
    const email = buildPricingEmail({ quotation, items });
    await Promise.all(admins.map((admin) => sendNotificationEmail({
      to: admin.email,
      subject: 'Quotation Pricing Added - Review Required',
      ...email
    })));
  } catch (_) {
    // Email delivery should not block pricing workflow when SMTP is unavailable.
  }
}
