import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { adminController } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';

// Configure Multer for ROC / AOC Report Uploads
let reportUploadDir = path.resolve(__dirname, '../../../uploads/report');
try {
  if (!fs.existsSync(reportUploadDir)) {
    fs.mkdirSync(reportUploadDir, { recursive: true });
  }
} catch (err) {
  reportUploadDir = path.join('/tmp', 'uploads', 'report');
  if (!fs.existsSync(reportUploadDir)) {
    fs.mkdirSync(reportUploadDir, { recursive: true });
  }
}

const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, reportUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadReport = multer({
  storage: reportStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed for ROC / AOC compliance reports.'));
    }
  },
});

const router = Router();

// Super Admin guard on all admin routes
router.use(requireAuth, requireRole([UserType.ADMIN]));

// Dashboard
router.get('/dashboard-stats', adminController.getDashboardStats);

// Customers
router.get('/customers', adminController.getCustomers);
router.post('/customers', adminController.createCustomer);
router.put('/customers/:id', adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// Customer Processes
router.get('/customers/:customerId/processes', adminController.getProcessesByCustomer);
router.post('/processes', adminController.addCustomerProcess);
router.post('/processes/:id/archive', adminController.archiveProcess);
router.get('/archived-processes', adminController.getArchivedProcesses);

// Assessors (QSA, QA, Consultant)
router.get('/assessors', adminController.getAssessors);
router.post('/assessors', adminController.createAssessor);
router.get('/assessors/:id/assignment-status', adminController.getAssessorAssignmentStatus);
router.delete('/assessors/:id', adminController.deleteAssessor);

// Frameworks & Projects
router.get('/compliance-services', adminController.getComplianceServices);
router.get('/testing-services', adminController.getTestingServices);
router.get('/compliance-projects', adminController.getComplianceProjects);
router.post('/compliance-projects', adminController.createComplianceProject);
router.get('/compliance-projects/:id/details', adminController.getComplianceProjectDetails);
router.post('/compliance-projects/:id/bulk-status', adminController.bulkUpdateComplianceReviewStatus);
router.post('/compliance-projects/:id/qa-modification', adminController.handleQaModification);
router.post('/compliance-projects/:id/customer-modification', adminController.handleCustomerModification);
router.post('/compliance-projects/:id/end-date', adminController.setProjectEndDate);
router.put('/compliance-projects/:id/status', adminController.updateProjectStatus);
router.post('/compliance-projects/:id/reports', uploadReport.single('reportFile'), adminController.uploadComplianceReport);
router.delete('/compliance-projects/:id/reports/:reportId', adminController.deleteComplianceReport);

router.get('/testing-projects', adminController.getTestingProjects);
router.post('/testing-projects', adminController.createTestingProject);

// Questionnaires
router.get('/questionnaires', adminController.getQuestionnaires);
router.post('/questionnaires', adminController.createQuestionnaire);
router.put('/questionnaires/bulk-status', adminController.bulkUpdateQuestionnaireStatus);
router.put('/questionnaires/:id', adminController.updateQuestionText);

export default router;
