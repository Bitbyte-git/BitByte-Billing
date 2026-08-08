import { Router } from 'express';
import { body } from 'express-validator';
import { createPayment, deletePayment, downloadPaymentAttachment, listPayments, updatePayment } from '../controllers/payment.controller.js';
import { createClientInvoiceRazorpayOrder, createInternInvoiceRazorpayOrder, verifyRazorpayPayment } from '../controllers/razorpay.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/razorpay/client-invoice/:id/order', createClientInvoiceRazorpayOrder);
router.post('/razorpay/intern-invoice/:id/order', createInternInvoiceRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

router.use(authenticate);
router.get('/', listPayments);
router.post('/', authorize('Admin'), [body('invoiceId').notEmpty()], validate, createPayment);
router.get('/:id/attachment', authorize('Admin'), downloadPaymentAttachment);
router.put('/:id', authorize('Admin'), updatePayment);
router.delete('/:id', authorize('Admin'), deletePayment);

export default router;
