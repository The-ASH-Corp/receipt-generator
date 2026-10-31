import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;

