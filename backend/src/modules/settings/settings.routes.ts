import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

router.use(authenticate);

// Meta routes
router.get('/form-metadata', settingsController.getFormMetadata);

// Machine routes
router.post('/machines', settingsController.createMachine);
router.get('/machines', settingsController.getAllMachines);
router.get('/machines/:id', settingsController.getMachineById);
router.patch('/machines/:id', settingsController.updateMachine);
router.delete('/machines/:id', settingsController.deleteMachine);

// Brick Type routes
router.post('/brick-types', settingsController.createBrickType);
router.get('/brick-types', settingsController.getAllBrickTypes);
router.get('/brick-types/:id', settingsController.getBrickTypeById);
router.patch('/brick-types/:id', settingsController.updateBrickType);
router.delete('/brick-types/:id', settingsController.deleteBrickType);

export default router;
