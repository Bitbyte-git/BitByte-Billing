import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', async (req, res, next) => {
  try { res.json(await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (err) { next(err); }
});
router.put('/:id/read', async (req, res, next) => {
  try { res.json(await Notification.findByIdAndUpdate(req.params.id, { status: 'Read' }, { new: true })); } catch (err) { next(err); }
});

export default router;
