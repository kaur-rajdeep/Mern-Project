import { Router } from 'express';
import { customerController } from '../controllers/customerController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';
import { uploadEvidenceStorage } from '../controllers/fileController';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth, requireRole([UserType.CUSTOMER]));

router.get('/dashboard', customerController.getDashboard);
router.get('/processes/:processId/services', customerController.getProcessServices);
router.get('/evidence/audit-view', customerController.getEvidenceAuditView);
router.post('/evidence/upload', uploadLimiter, uploadEvidenceStorage.array('files', 10), customerController.uploadEvidence);
router.delete('/evidence-docs/:id', customerController.deleteEvidenceDoc);
router.post('/evidence/request-modification', customerController.requestModification);
router.get('/reports/years', customerController.getAttestationYears);
router.get('/reports', customerController.getAttestationReports);

export default router;
