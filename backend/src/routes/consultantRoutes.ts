import { Router } from 'express';
import { consultantController } from '../controllers/consultantController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';
import { uploadConsultantStorage } from '../controllers/fileController';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth, requireRole([UserType.CONSULTANT]));

router.get('/dashboard', consultantController.getDashboard);
router.get('/audit-view', consultantController.getAuditView);
router.put('/evidence/status', consultantController.updateStatus);
router.post('/evidence/bulk-status', consultantController.bulkUpdateStatus);
router.post('/evidence/upload-supplementary', uploadLimiter, uploadConsultantStorage.array('files', 10), consultantController.uploadSupplementary);
router.delete('/supplementary-docs/:id', consultantController.deleteSupplementary);

export default router;
