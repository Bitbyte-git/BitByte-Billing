import { Router } from 'express';
import {
  createInternInvoiceRecord,
  deleteInternInvoice,
  generateInternInvoice,
  getInternInvoice,
  internInvoicePdf,
  listInternInvoices,
  sendInternInvoiceEmail,
  syncGoogleFormInternRecords,
  updateInternInvoiceRecord
} from '../controllers/internInvoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('Admin', 'Accountant'));
router.get('/', listInternInvoices);
router.post('/', createInternInvoiceRecord);
router.post('/sync-google-form', syncGoogleFormInternRecords);
router.get('/:id', getInternInvoice);
router.put('/:id', updateInternInvoiceRecord);
router.delete('/:id', deleteInternInvoice);
router.post('/:id/generate', generateInternInvoice);
router.get('/:id/pdf', internInvoicePdf);
router.post('/:id/send-email', sendInternInvoiceEmail);

export default router;
