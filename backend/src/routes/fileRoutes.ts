import { Router } from 'express';
import { fileController, uploadReportStorage } from '../controllers/fileController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { uploadLimiter } from '../middleware/rateLimiter';
import { UserType } from '../constants/roles';

const router = Router();

router.get('/download', requireAuth, fileController.downloadFile);
router.get('/:type/:filename', requireAuth, fileController.downloadFile);
router.post('/reports/upload', requireAuth, requireRole([UserType.ADMIN]), uploadLimiter, uploadReportStorage.single('report'), fileController.uploadReport);

export default router;
