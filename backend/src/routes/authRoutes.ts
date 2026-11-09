import { Router } from 'express';
import { loginAdmin, getCurrentAdmin } from '../controllers/authController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', loginAdmin);
router.get('/me', protectAdmin, getCurrentAdmin);

export default router;
