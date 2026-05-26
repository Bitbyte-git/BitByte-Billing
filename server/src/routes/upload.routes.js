import { Router } from 'express';
import { body } from 'express-validator';
import { uploadFile } from '../controllers/upload.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.post(
  '/cloudinary',
  authorize('Client', 'Accountant', 'Admin'),
  [
    body('filename').optional().isString(),
    body('fileData').notEmpty()
  ],
  validate,
  uploadFile
);

export default router;
