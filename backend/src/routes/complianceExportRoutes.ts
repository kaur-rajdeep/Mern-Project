import { Router } from 'express';
import { complianceExportController } from '../controllers/complianceExportController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';

const router = Router();

// Export evidence package (.zip with Excel matrix) - Admin, QSA, QA, Consultant only
router.post(
  '/export-package',
  requireAuth,
  requireRole([UserType.ADMIN, UserType.QSA, UserType.QA, UserType.CONSULTANT]),
  complianceExportController.exportEvidencePackage
);

// Get evidence download audit logs - Admin & QA only
router.get(
  '/export-logs',
  requireAuth,
  requireRole([UserType.ADMIN, UserType.QA]),
  complianceExportController.getExportLogs
);

export default router;
