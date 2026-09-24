import { Router } from 'express';
import { body } from 'express-validator';
import { createBill, getBill, listBills, billPdf, updateBillStatus } from '../controllers/instantBill.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.get('/', listBills);
router.get('/:id', getBill);
router.post('/', authorize('Accountant', 'Admin'), [
  body('projectTitle').optional(),
], validate, createBill);
router.get('/:id/pdf', authorize('Accountant', 'Admin'), billPdf);
router.put('/:id/status', authorize('Accountant', 'Admin'), updateBillStatus);

export default router;
