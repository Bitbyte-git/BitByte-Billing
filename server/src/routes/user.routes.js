import { Router } from 'express';
import { getUsers } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('Admin'));

router.get('/', getUsers);

export default router;
