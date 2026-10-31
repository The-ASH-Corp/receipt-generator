import { Router } from 'express';
import { registerAdmin, loginAdmin, getCurrentAdmin } from '../controllers/authController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protectAdmin, getCurrentAdmin);

export default router;
