import { Router } from 'express';
import { body } from 'express-validator';
import { createPayment, deletePayment, listPayments, updatePayment } from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.get('/', listPayments);
router.post('/', authorize('Admin'), [body('invoiceId').notEmpty(), body('amount').isFloat({ min: 0 }), body('paymentMethod').notEmpty()], validate, createPayment);
router.put('/:id', authorize('Admin'), updatePayment);
router.delete('/:id', authorize('Admin'), deletePayment);

export default router;
