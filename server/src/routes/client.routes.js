import { Router } from 'express';
import { body } from 'express-validator';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nextClientId } from '../utils/idGenerator.js';
import mongoose from 'mongoose';

const router = Router();
const controller = crudController(Client, { beforeCreate: async (req) => ({ ...req.body, clientId: await nextClientId(), registeredBy: req.user._id }) });

async function deleteClient(req, res, next) {
  try {
    const rawId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(rawId);
    const client = await Client.findOne({
      $or: [
        ...(isObjectId ? [{ _id: rawId }] : []),
        { clientId: rawId }
      ]
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const clientId = client._id;

    // 1. Find all quotations for this client and clean up their items, invoices, payments
    const quotations = await Quotation.find({ clientId });
    for (const q of quotations) {
      await QuotationItem.deleteMany({ quotationId: q._id });
      const invoices = await Invoice.find({ quotationId: q._id });
      for (const inv of invoices) {
        await Payment.deleteMany({ invoiceId: inv._id });
      }
      await Invoice.deleteMany({ quotationId: q._id });
    }
    await Quotation.deleteMany({ clientId });

    // 2. Any orphan invoices or payments referencing clientId directly
    const directInvoices = await Invoice.find({ clientId });
    for (const inv of directInvoices) {
      await Payment.deleteMany({ invoiceId: inv._id });
    }
    await Invoice.deleteMany({ clientId });
    await Payment.deleteMany({ clientId });

    // 3. Delete the client itself
    await Client.findByIdAndDelete(clientId);

    res.json({
      success: true,
      message: `Client ${client.companyName || client.fullName || client.clientId} deleted successfully.`
    });
  } catch (err) {
    console.error('Delete client error:', err);
    next(err);
  }
}

router.use(authenticate);
router.get('/', authorize('Admin', 'Accountant'), controller.list);
router.get('/:id', controller.get);
router.post('/', authorize('Admin', 'Accountant'), [body('email').isEmail(), body('phone').matches(/^\d{10}$/), body('gstin').optional().isLength({ min: 15, max: 15 })], validate, controller.create);
router.put('/:id', authorize('Admin', 'Accountant'), controller.update);
router.delete('/:id', authorize('Admin', 'Accountant'), deleteClient);

export default router;
