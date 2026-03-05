import { Router } from 'express';
import { ClientsController } from './clients.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new ClientsController();

router.use(authenticate);

// ─── Clients ───
router.post('/', ctrl.createClient);
router.get('/', ctrl.getAllClients);
router.get('/upcoming-dispatches', ctrl.getUpcomingDispatches);
router.get('/:id', ctrl.getClientById);
router.patch('/:id', ctrl.updateClient);
router.delete('/:id', ctrl.deleteClient);
router.get('/:id/ledger', ctrl.getClientLedger);

// ─── Orders ───
router.post('/orders', ctrl.createOrder);
router.get('/orders/all', ctrl.getAllOrders);
router.get('/orders/:id', ctrl.getOrderById);
router.patch('/orders/:id', ctrl.updateOrder);
router.delete('/orders/:id', ctrl.deleteOrder);

// ─── Payments ───
router.post('/payments', ctrl.createPayment);
router.get('/payments/all', ctrl.getAllPayments);
router.patch('/payments/:id', ctrl.updatePayment);
router.delete('/payments/:id', ctrl.deletePayment);

// ─── Dispatch Scheduling ───
router.post('/schedules', ctrl.createSchedule);
router.get('/schedules/all', ctrl.getAllSchedules);
router.patch('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

export default router;
