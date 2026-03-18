import { Router } from 'express';
import { AlertsController } from './alerts.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const alertsController = new AlertsController();

router.use(authenticate);

router.get('/', alertsController.getAlerts);
router.patch('/:id/read', alertsController.markRead);
router.post('/read-all', alertsController.markAllRead);

export default router;
