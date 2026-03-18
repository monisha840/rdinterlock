import { Router, Request, Response } from 'express';
import authRoutes from './modules/auth/auth.routes';
import workersRoutes from './modules/workers/workers.routes';
import productionRoutes from './modules/production/production.routes';
import dispatchRoutes from './modules/dispatch/dispatch.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import cashbookRoutes from './modules/cashbook/cashbook.routes';
import stockRoutes from './modules/stock/stock.routes';
import reportsRoutes from './modules/reports/reports.routes';
import settingsRoutes from './modules/settings/settings.routes';
import wageRoutes from './modules/wages/wage.routes';
import settlementRoutes from './modules/settlements/settlement.routes';
import materialRoutes from './modules/materials/material.routes';
import clientRoutes from './modules/clients/clients.routes';
import transportRoutes from './modules/transport/transport.routes';
import materialConfigRoutes from './modules/materials/material-config.routes';
import returnRoutes from './modules/materials/returns.routes';
import alertsRoutes from './modules/alerts/alerts.routes';
import remindersRoutes from './modules/reminders/reminders.routes';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'RD Interlock API is running',
    timestamp: new Date().toISOString(),
  });
});

// Module routes
router.use('/auth', authRoutes);
router.use('/workers', workersRoutes);
router.use('/production', productionRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/expenses', expensesRoutes);
router.use('/cash', cashbookRoutes);
router.use('/stock', stockRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/wages', wageRoutes);
router.use('/settlements', settlementRoutes);
router.use('/materials', materialRoutes);
router.use('/clients', clientRoutes);
router.use('/transport', transportRoutes);
router.use('/material-config', materialConfigRoutes);
router.use('/returns', returnRoutes);
router.use('/alerts', alertsRoutes);
router.use('/reminders', remindersRoutes);

// Alias for dashboard summary (as per requirements)
router.use('/dashboard', reportsRoutes);

export default router;
