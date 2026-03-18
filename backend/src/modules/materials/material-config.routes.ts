import { Router } from 'express';
import { MaterialConfigController } from './material-config.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new MaterialConfigController();

router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:brickTypeId', controller.getByBrickType);
router.post('/', controller.upsert);
router.delete('/:brickTypeId', controller.delete);

export default router;
