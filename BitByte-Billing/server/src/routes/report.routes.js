import { Router } from 'express';
import { dashboard, paymentReport, quotationReport, revenue } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('Admin', 'Accountant'));
router.get('/dashboard', dashboard);
router.get('/revenue', revenue);
router.get('/quotations', quotationReport);
router.get('/payments', paymentReport);

export default router;
