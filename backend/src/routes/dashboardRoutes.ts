import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protectAdmin, getDashboardSummary);

export default router;

