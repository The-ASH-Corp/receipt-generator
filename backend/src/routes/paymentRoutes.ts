import { Router } from 'express';
import {
  recordPayment,
  getTransactions,
  getPaymentDetails,
  downloadReceiptPdf,
} from '../controllers/paymentController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', getTransactions);
router.post('/', recordPayment);
router.get('/:id', getPaymentDetails);
router.get('/:id/receipt', downloadReceiptPdf);

export default router;

