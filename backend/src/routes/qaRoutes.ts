import { Router } from 'express';
import { qaController } from '../controllers/qaController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';
import { uploadQaStorage } from '../controllers/fileController';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth, requireRole([UserType.QA]));

router.get('/dashboard', qaController.getDashboard);
router.get('/audit-view', qaController.getAuditView);
router.put('/evidence/status', qaController.updateStatus);
router.post('/evidence/bulk-status', qaController.bulkUpdateStatus);
router.post('/evidence/upload-supplementary', uploadLimiter, uploadQaStorage.array('files', 10), qaController.uploadSupplementary);
router.delete('/supplementary-docs/:id', qaController.deleteSupplementary);
router.post('/evidence/request-modification', qaController.requestModification);

export default router;
