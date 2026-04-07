import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const reportsController = new ReportsController();

router.use(authenticate);

router.get('/dashboard', reportsController.getDashboardSummary);
router.get('/production', reportsController.getProductionReport);
router.get('/dispatch', reportsController.getDispatchReport);
router.get('/financial', reportsController.getFinancialReport);
router.get('/workers', reportsController.getWorkerReport);
router.get('/logs/:id', reportsController.getPersonLogs);
router.get('/summary', reportsController.getSummary);
router.get('/tipper-ledger', reportsController.getTipperLedger);
router.get('/mason-ledger', reportsController.getMasonLedger);

export default router;
