import { Router } from 'express';
import { StockController } from './stock.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const stockController = new StockController();

router.use(authenticate);

router.get('/current', stockController.getCurrentStock);
router.get('/ready', stockController.getReadyStock);
router.get('/history', stockController.getStockHistory);
router.get('/alerts', stockController.getInventoryAlerts);

export default router;
