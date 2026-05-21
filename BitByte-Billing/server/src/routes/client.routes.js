import { Router } from 'express';
import { body } from 'express-validator';
import Client from '../models/Client.js';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nextClientId } from '../utils/idGenerator.js';

const router = Router();
const controller = crudController(Client, { beforeCreate: async (req) => ({ ...req.body, clientId: await nextClientId(), registeredBy: req.user._id }) });

router.use(authenticate);
router.get('/', authorize('Admin', 'Accountant'), controller.list);
router.get('/:id', controller.get);
router.post('/', authorize('Admin'), [body('email').isEmail(), body('phone').matches(/^\d{10}$/), body('gstin').optional().isLength({ min: 15, max: 15 })], validate, controller.create);
router.put('/:id', authorize('Admin'), controller.update);

export default router;
