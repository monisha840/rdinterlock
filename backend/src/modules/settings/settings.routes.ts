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

// Raw Material routes
router.post('/raw-materials', settingsController.createRawMaterial);
router.get('/raw-materials', settingsController.getAllRawMaterials);
router.delete('/raw-materials/:id', settingsController.deleteRawMaterial);

// System Settings routes
router.get('/system', settingsController.getSystemSettings);
router.post('/system', settingsController.updateSystemSettings);

export default router;
