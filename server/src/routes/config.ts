import { Router } from 'express';
import { configController } from '../controllers/configController';

const router = Router();

// Public - get app configuration (TON + active packages)
router.get('/', configController.getAppConfig);

// Admin routes (TODO: add admin auth middleware)
// TON config
router.put('/ton', configController.updateTonConfig);

// Coin packages CRUD
router.get('/packages', configController.listPackages);
router.get('/packages/:id', configController.getPackage);
router.post('/packages', configController.createPackage);
router.put('/packages/:id', configController.updatePackage);
router.delete('/packages/:id', configController.deletePackage);

export default router;
