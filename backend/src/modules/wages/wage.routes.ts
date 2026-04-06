import { Router } from 'express';
import { WageController } from './wage.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const wageController = new WageController();

// All routes require authentication
router.use(authenticate);

// ============== ATTENDANCE ROUTES ==============
router.post('/attendance', wageController.markAttendance.bind(wageController));
router.post(
  '/attendance/bulk',
  wageController.bulkMarkAttendance.bind(wageController)
);
router.get('/attendance', wageController.getAttendance.bind(wageController));

// ============== WAGE ROUTES ==============
router.post('/wages/calculate', wageController.calculateWages.bind(wageController));
router.get('/wages', wageController.getWages.bind(wageController));
router.post('/wages/pay', wageController.payWages.bind(wageController));
router.delete('/wages/:id', wageController.deleteWage.bind(wageController));
router.get('/wages/summary', wageController.getWageSummary.bind(wageController));
router.get('/worker-report', wageController.getWorkerWageReport.bind(wageController));

// ============== ADVANCE ROUTES ==============
router.post(
  '/workers/:id/advance',
  wageController.giveAdvance.bind(wageController)
);
router.get(
  '/workers/:id/advance-history',
  wageController.getAdvanceHistory.bind(wageController)
);
router.get(
  '/workers/:id/advance-balance',
  wageController.getAdvanceBalance.bind(wageController)
);
router.get(
  '/advances/pending',
  wageController.getWorkersWithPendingAdvances.bind(wageController)
);
router.post(
  '/advances/bulk',
  wageController.bulkGiveAdvance.bind(wageController)
);
router.get(
  '/advances/by-role',
  wageController.getAdvancesByRole.bind(wageController)
);

export default router;
