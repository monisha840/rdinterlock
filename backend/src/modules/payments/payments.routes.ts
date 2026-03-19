import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new PaymentsController();

router.use(authenticate);

router.post('/staff', asyncHandler(controller.createPayment.bind(controller)));
router.get('/staff/:personId', asyncHandler(controller.getPaymentsByPerson.bind(controller)));

export default router;
