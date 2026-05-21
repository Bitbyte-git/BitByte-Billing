import { Router } from 'express';
import Service from '../models/Service.js';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const controller = crudController(Service);

router.use(authenticate);
router.get('/', controller.list);
router.post('/', authorize('Admin'), controller.create);
router.put('/:id', authorize('Admin'), controller.update);
router.delete('/:id', authorize('Admin'), controller.remove);

export default router;
