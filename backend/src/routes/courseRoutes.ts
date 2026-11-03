import { Router } from 'express';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', getCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;

