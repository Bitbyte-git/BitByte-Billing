import Client from '../models/Client.js';
import InstantBill from '../models/InstantBill.js';
import { nextBillId } from '../utils/idGenerator.js';
import { getSacCode } from '../utils/sacCodes.js';
import { recordAudit } from '../services/workflowService.js';
import { createBillPdfDocument } from '../utils/billPdf.js';

export async function listBills(req, res, next) {
  try {
    const query = req.user.role === 'Client'
      ? { clientId: (await Client.findOne({ email: req.user.email }))?._id }
      : {};
    const bills = await InstantBill.find(query).populate('clientId').sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) { next(err); }
}

export async function getBill(req, res, next) {
  try {
    const bill = await InstantBill.findById(req.params.id).populate('clientId createdBy');
    if (!bill) throw Object.assign(new Error('Bill not found'), { status: 404 });
    res.json(bill);
  } catch (err) { next(err); }
}

export async function createBill(req, res, next) {
  try {
    // Resolve client
    let clientId = req.body.clientId;
    if (!clientId && req.body.clientDetails) {
      const { fullName, email, phone, companyName, address, gstin } = req.body.clientDetails;
      if (email || phone) {
        let existing = await Client.findOne({ $or: [{ email: email?.toLowerCase() }, { phone }] });
        if (existing) {
          clientId = existing._id;
        } else {
          const newClient = await Client.create({
            clientId: `AUTO-${Date.now().toString(36).toUpperCase()}`,
            fullName: fullName || companyName || 'Client',
            companyName: companyName || fullName || 'Client',
            email: email || `client-${Date.now()}@bitbytetech.org`,
            phone: phone || '0000000000',
            address: address || '',
            gstin: gstin || '',
            registeredBy: req.user._id
          });
          clientId = newClient._id;
        }
      }
    }

    if (!clientId) {
      throw Object.assign(new Error('Client is required'), { status: 422 });
    }

    // Process costing items
    const costingItems = (req.body.costingItems || []).map(item => {
      const basePrice = Number(item.basePrice || 0);
      const quantity = Number(item.quantity || 1);
      const discountAmount = Number(item.discountAmount || 0);
      const taxableValue = Number(item.taxableValue ?? ((basePrice * quantity) - discountAmount));
      return {
        ...item,
        sacCode: item.sacCode || getSacCode(item.subService || item.subServiceName),
        basePrice,
        quantity,
        discountAmount,
        taxableValue,
        addedBy: req.user._id,
        addedByName: req.user.name || req.user.email
      };
    });

    const subtotal = costingItems.reduce((sum, item) => sum + item.taxableValue, 0);
    const gstAmount = costingItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
    const totalAmount = subtotal + gstAmount;

    const mainService = [...new Set(costingItems.map(i => i.mainService).filter(Boolean))];
    const subServices = costingItems.map(i => i.subService || i.subServiceName).filter(Boolean);
    const projectTitle = req.body.projectTitle || (subServices.length ? subServices[0] : 'Instant Bill');

    const bill = await InstantBill.create({
      billId: await nextBillId(),
      createdBy: req.user._id,
      clientId,
      projectTitle,
      billDate: req.body.billDate || new Date(),
      dueDate: req.body.dueDate || new Date(Date.now() + 15 * 86400000),
      paymentTerms: req.body.paymentTerms || 'Due on Receipt',
      notes: req.body.notes || '',
      mainService,
      subServices,
      costingItems,
      subtotal,
      gstAmount,
      totalAmount,
      status: 'Issued',
    });

    await recordAudit({
      userId: req.user._id,
      action: `Instant Bill created by ${req.user.role}`,
      entityType: 'InstantBill',
      entityId: bill._id,
      newValue: bill.toObject()
    });

    const populated = await InstantBill.findById(bill._id).populate('clientId');
    res.status(201).json(populated);
  } catch (err) {
    console.error('CreateBill error:', err);
    next(err);
  }
}

export async function billPdf(req, res, next) {
  try {
    const bill = await InstantBill.findById(req.params.id).populate('clientId createdBy');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const pdfDoc = createBillPdfDocument(bill);
    const safeId = bill.billId || String(bill._id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeId}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) { next(err); }
}

export async function updateBillStatus(req, res, next) {
  try {
    const bill = await InstantBill.findById(req.params.id);
    if (!bill) throw Object.assign(new Error('Bill not found'), { status: 404 });
    bill.status = req.body.status;
    await bill.save();
    res.json(bill);
  } catch (err) { next(err); }
}
