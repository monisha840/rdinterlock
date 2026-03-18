import { Router } from 'express';
import { RemindersController } from './reminders.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const remindersController = new RemindersController();

router.use(authenticate);

router.post('/', remindersController.createReminder);
router.get('/', remindersController.getReminders);
router.get('/today', remindersController.getTodaysReminders);
router.patch('/:id', remindersController.updateReminder);
router.delete('/:id', remindersController.deleteReminder);

export default router;
