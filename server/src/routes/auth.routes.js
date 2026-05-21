import { Router } from 'express';
import { body } from 'express-validator';
import { listUsers, login, logout, me, register, registerClientPublic, removeUser, viewCredentials } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', authenticate, authorize('Admin'), [
  body('email').isEmail(),
  body('phone').optional().matches(/^\d{10}$/),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['Client', 'Accountant', 'Admin'])
], validate, register);

router.post('/register/client', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').matches(/^\d{10}$/),
  body('password').isLength({ min: 8 })
], validate, registerClientPublic);
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], validate, login);
router.post('/logout', logout);
router.get('/users', authenticate, authorize('Admin'), listUsers);
router.delete('/users/:id', authenticate, authorize('Admin'), removeUser);
router.post('/users/:id/credentials', authenticate, authorize('Admin'), [body('pin').notEmpty()], validate, viewCredentials);
router.get('/me', authenticate, me);

export default router;
