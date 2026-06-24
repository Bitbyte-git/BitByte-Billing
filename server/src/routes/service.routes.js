import { Router } from 'express';
import Service from '../models/Service.js';
import { crudController } from '../controllers/crud.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { syncServicePricingFromGoogleSheet } from '../services/googleServicePricingService.js';

const router = Router();
const controller = crudController(Service);

router.use(authenticate);
router.get('/', controller.list);
router.post('/sync-google-sheet', authorize('Admin'), async (_req, res, next) => {
  try {
    const summary = await syncServicePricingFromGoogleSheet();
    res.json({ message: 'Service pricing synced from Google Sheet', summary });
  } catch (error) {
    next(error);
  }
});
router.post('/', authorize('Admin'), controller.create);
router.put('/:id', authorize('Admin'), controller.update);
router.delete('/:id', authorize('Admin'), controller.remove);

export default router;
