import { Router } from 'express';
import { ReturnsController } from './returns.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new ReturnsController();

router.use(authenticate);

router.get('/', controller.getAll);
router.get('/dispatch/:dispatchId', controller.getByDispatch);
router.post('/', controller.create);
router.delete('/:id', controller.delete);

export default router;
