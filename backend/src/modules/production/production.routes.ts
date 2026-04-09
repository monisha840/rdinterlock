import { Router } from 'express';
import { ProductionController } from './production.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const productionController = new ProductionController();

router.use(authenticate);

router.post('/', productionController.createProduction);
router.get('/', productionController.getProductions);
router.get('/history', productionController.getProductionHistory);
router.get('/:id', productionController.getProductionById);
router.patch('/:id', productionController.updateProduction);
router.delete('/:id', productionController.deleteProduction);

export default router;
