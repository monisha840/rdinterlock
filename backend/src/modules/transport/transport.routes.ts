import { Router } from 'express';
import * as transportController from './transport.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Vehicles
router.post('/vehicles', transportController.createVehicle);
router.get('/vehicles', transportController.getVehicles);
router.patch('/vehicles/:id', transportController.updateVehicle);
router.delete('/vehicles/:id', transportController.deleteVehicle);

// Vendors
router.post('/vendors', transportController.createVendor);
router.get('/vendors', transportController.getVendors);

// Entries
router.post('/entries', transportController.createEntry);
router.get('/entries', transportController.getEntries);
router.delete('/entries/:id', transportController.deleteEntry);
router.get('/summary', transportController.getSummary);

export default router;
