import { Router } from 'express';
import { WorkersController } from './workers.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const workersController = new WorkersController();

router.use(authenticate);

router.post('/', workersController.createWorker);
router.get('/', workersController.getAllWorkers);
router.get('/:id', workersController.getWorkerById);
router.patch('/:id', workersController.updateWorker);
router.delete('/:id', workersController.deleteWorker);
router.get('/:id/stats', workersController.getWorkerStats);
router.get('/:id/ledger', workersController.getWorkerLedger);

export default router;
