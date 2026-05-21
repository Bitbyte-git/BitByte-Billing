import { Router } from 'express';
import { generateInvoice, getInvoice, invoicePdf, listInvoices, sendInvoiceEmail } from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/generate/:quotationId', authorize('Admin'), generateInvoice);
router.get('/:id/pdf', invoicePdf);
router.post('/:id/send-email', authorize('Admin'), sendInvoiceEmail);

export default router;
