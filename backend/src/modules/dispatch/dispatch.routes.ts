import { Router } from 'express';
import { DispatchController } from './dispatch.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const dispatchController = new DispatchController();

router.use(authenticate);

// Customer routes
router.post('/customers', dispatchController.createCustomer);
router.get('/customers', dispatchController.getAllCustomers);
router.get('/customers/:id', dispatchController.getCustomerById);

// Dispatch routes
router.post('/', dispatchController.createDispatch);
router.get('/', dispatchController.getDispatches);
router.get('/:id', dispatchController.getDispatchById);
router.patch('/:id', dispatchController.updateDispatch);
router.delete('/:id', dispatchController.deleteDispatch);

export default router;
