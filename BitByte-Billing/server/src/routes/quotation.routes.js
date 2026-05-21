import { Router } from 'express';
import { body } from 'express-validator';
import { addCosting, addRemark, approve, clarification, createQuotation, forwardToAdmin, getQuotation, listQuotations, reject, updateQuotation, updateStatus } from '../controllers/quotation.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.get('/', listQuotations);
router.get('/:id', getQuotation);
router.post('/', authorize('Client'), [
  body('mainService').notEmpty(),
  body('projectTitle').notEmpty(),
  body('requirementDetails').notEmpty()
], validate, createQuotation);
router.put('/:id', updateQuotation);
router.put('/:id/status', updateStatus);
router.post('/:id/remarks', body('message').notEmpty(), validate, addRemark);
router.post('/:id/costing', authorize('Accountant'), body('items').isArray({ min: 1 }), validate, addCosting);
router.post('/:id/forward-to-admin', authorize('Accountant'), forwardToAdmin);
router.post('/:id/clarification', authorize('Accountant'), body('message').notEmpty(), validate, clarification);
router.post('/:id/approve', authorize('Admin'), approve);
router.post('/:id/reject', authorize('Admin'), reject);

export default router;
