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
      if (fullName || companyName || email || phone) {
        const rawDigits = String(phone || '').replace(/\D/g, '');
        const cleanedPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : '';
        const validPhone = cleanedPhone || String(Math.floor(1000000000 + Math.random() * 9000000000));
        const validEmail = (email && email.includes('@')) ? email.trim().toLowerCase() : `client-${Date.now()}@bitbytetech.org`;
        const validName = (fullName || companyName || 'Client').trim();
        const validCompany = (companyName || '').trim();
        const validGstin = (gstin && gstin.length === 15) ? gstin.trim().toUpperCase() : '';

        let existing = await Client.findOne({
          $or: [
            { email: validEmail },
            ...(cleanedPhone ? [{ phone: cleanedPhone }] : [])
          ]
        });

        if (existing) {
          clientId = existing._id;
        } else {
          const newClient = await Client.create({
            clientId: `AUTO-${Date.now().toString(36).toUpperCase()}`,
            fullName: validName,
            companyName: validCompany,
            email: validEmail,
            phone: validPhone,
            address: address || '',
            gstin: validGstin,
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

function publicBillPayload(bill) {
  const client = bill.clientId || {};
  const costingItems = bill.costingItems || [];
  const subtotal = Number(bill.subtotal || 0);
  const gstAmount = Number(bill.gstAmount || 0);
  const totalAmount = Number(bill.totalAmount || 0);

  return {
    _id: bill._id,
    billId: bill.billId,
    projectTitle: bill.projectTitle || 'Instant Bill',
    status: bill.status || 'Issued',
    billDate: bill.billDate || bill.createdAt,
    dueDate: bill.dueDate,
    paymentTerms: bill.paymentTerms || 'Due on Receipt',
    clientName: client.fullName || client.companyName || 'Client',
    companyName: client.companyName || '-',
    clientEmail: client.email || '-',
    clientPhone: client.phone || '-',
    items: costingItems.map((item) => ({
      service: item.subService || item.subServiceName || item.mainService || 'Service',
      description: item.description || '',
      sacCode: item.sacCode || getSacCode(item.subService || item.subServiceName) || '998314',
      quantity: Number(item.quantity || 1),
      basePrice: Number(item.basePrice || 0),
      taxableValue: Number(item.taxableValue || 0),
      gstAmount: Number(item.gstAmount || 0),
      total: Number(item.totalAmount || 0)
    })),
    subtotal,
    gstAmount,
    totalAmount,
    notes: bill.notes || ''
  };
}

export async function getPublicBill(req, res, next) {
  try {
    const rawId = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);
    const bill = await InstantBill.findOne({
      $or: [
        ...(isObjectId ? [{ _id: rawId }] : []),
        { billId: rawId }
      ]
    }).populate('clientId');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json(publicBillPayload(bill));
  } catch (err) {
    next(err);
  }
}
