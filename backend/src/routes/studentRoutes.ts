import { Router } from 'express';
import {
  getStudents,
  getStudentProfile,
  createStudent,
  updateStudent,
} from '../controllers/studentController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', getStudents);
router.post('/', createStudent);
router.get('/:id', getStudentProfile);
router.put('/:id', updateStudent);

export default router;

