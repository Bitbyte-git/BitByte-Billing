import { Router } from 'express';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json({ clients: [], quotations: [], invoices: [] });

    const regex = new RegExp(q, 'i');

    const clients = await User.find({ role: 'Client', $or: [{ name: regex }, { email: regex }] }).limit(5);
    
    // We search quotations by project title or quotation ID
    const quotations = await Quotation.find({ $or: [{ projectTitle: regex }, { quotationId: regex }] }).populate('clientId').limit(5);
    
    // Invoices by invoice ID
    const invoices = await Invoice.find({ invoiceId: regex }).limit(5);

    res.json({ clients, quotations, invoices });
  } catch (err) {
    next(err);
  }
});

export default router;
