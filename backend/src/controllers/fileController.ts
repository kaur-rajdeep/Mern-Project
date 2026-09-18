import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { EvidenceDocument, AssessorDocument, ComplianceReport, ComplianceProject } from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';
import { formatErrorMessage } from '../utils/formatError';

import { storageService } from '../services/storageService';

let UPLOADS_ROOT = storageService.getUploadsRoot();

// Allowed file extensions & disallowed dangerous formats
const ALLOWED_EVIDENCE_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.txt', '.zip', '.rar', '.7z'];
const DISALLOWED_EXTS = ['.html', '.htm', '.xhtml', '.svg', '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.jsp', '.asp', '.aspx', '.py', '.js', '.mjs', '.vbs', '.msi', '.dll', '.scr', '.ps1'];

const commonFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (DISALLOWED_EXTS.includes(ext)) {
    return cb(new Error(`File format '${ext}' is strictly prohibited for security reasons.`));
  }
  if (ALLOWED_EVIDENCE_EXTS.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error(`File format '${ext}' is not supported. Allowed formats: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), CSV, Images (PNG/JPG), TXT, and ZIP/RAR archives.`));
  }
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB uniform limit

export const uploadEvidenceStorage = multer({
  storage: storageService.createHybridMulterStorage('evidence'),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: commonFileFilter,
});

export const uploadQsaStorage = multer({
  storage: storageService.createHybridMulterStorage('qsa'),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: commonFileFilter,
});

export const uploadQaStorage = multer({
  storage: storageService.createHybridMulterStorage('qa'),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: commonFileFilter,
});

export const uploadConsultantStorage = multer({
  storage: storageService.createHybridMulterStorage('consultants'),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: commonFileFilter,
});

export const uploadReportStorage = multer({
  storage: storageService.createHybridMulterStorage('report'),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: commonFileFilter,
});

export const uploadMemoryStorage = multer({ storage: multer.memoryStorage() });

export class FileController {
  public async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
        return;
      }

      let type = req.params.type;
      let filename = req.params.filename;

      if (req.query.path && typeof req.query.path === 'string') {
        const parts = req.query.path.split(/[\/\\]/);
        if (parts.length >= 2) {
          type = parts[0];
          filename = parts.slice(1).join('/');
        } else if (parts.length === 1) {
          type = 'evidence';
          filename = parts[0];
        }
      }

      const allowedTypes = ['evidence', 'qsa', 'qa', 'consultants', 'consultant', 'report'];
      if (!type || !allowedTypes.includes(type.toLowerCase())) {
        res.status(400).json({ success: false, message: 'Invalid file category requested.' });
        return;
      }

      const safeFilename = path.basename(filename || '');
      if (!safeFilename || safeFilename === '.' || safeFilename.includes('..')) {
        res.status(400).json({ success: false, message: 'Invalid filename specified.' });
        return;
      }

      const safeFolder = type.toLowerCase() === 'consultant' ? 'consultants' : type.toLowerCase();

      // SEC-002: Resource-level RBAC & tenant scoping
      if (user.userType !== UserType.ADMIN) {
        let isAuthorized = false;

        if (safeFolder === 'evidence') {
          const doc = await EvidenceDocument.findOne({ docs: safeFilename });
          if (doc) {
            if (user.userType === UserType.CUSTOMER) {
              const customerId = user.parentId || user._id;
              isAuthorized = doc.customerId.toString() === customerId.toString();
            } else if (user.userType === UserType.QSA) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                qsaId: user._id,
              }));
            } else if (user.userType === UserType.QA) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                qaId: user._id,
              }));
            } else if (user.userType === UserType.CONSULTANT) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                consultantId: user._id,
              }));
            }
          }
        } else if (safeFolder === 'qsa' || safeFolder === 'qa' || safeFolder === 'consultants') {
          const doc = await AssessorDocument.findOne({ docs: safeFilename });
          if (doc) {
            if (user.userType === UserType.CUSTOMER) {
              const customerId = user.parentId || user._id;
              isAuthorized = doc.customerId.toString() === customerId.toString();
            } else if (user.userType === UserType.QSA) {
              isAuthorized = doc.userId.toString() === user._id.toString() || !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                qsaId: user._id,
              }));
            } else if (user.userType === UserType.QA) {
              isAuthorized = doc.userId.toString() === user._id.toString() || !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                qaId: user._id,
              }));
            } else if (user.userType === UserType.CONSULTANT) {
              isAuthorized = doc.userId.toString() === user._id.toString() || !!(await ComplianceProject.exists({
                processId: doc.processId,
                serviceId: doc.serviceId,
                customerId: doc.customerId,
                consultantId: user._id,
              }));
            }
          }
        } else if (safeFolder === 'report') {
          const rep = await ComplianceReport.findOne({ reportDocs: safeFilename });
          if (rep) {
            if (user.userType === UserType.CUSTOMER) {
              const customerId = user.parentId || user._id;
              isAuthorized = rep.customerId.toString() === customerId.toString();
            } else if (user.userType === UserType.QSA) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: rep.processId,
                serviceId: rep.serviceId,
                customerId: rep.customerId,
                qsaId: user._id,
              }));
            } else if (user.userType === UserType.QA) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: rep.processId,
                serviceId: rep.serviceId,
                customerId: rep.customerId,
                qaId: user._id,
              }));
            } else if (user.userType === UserType.CONSULTANT) {
              isAuthorized = !!(await ComplianceProject.exists({
                processId: rep.processId,
                serviceId: rep.serviceId,
                customerId: rep.customerId,
                consultantId: user._id,
              }));
            }
          }
        }

        if (!isAuthorized) {
          res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to access this document.' });
          return;
        }
      }

      // SEC-004: Strictly return 404 if file does not exist
      const exists = await storageService.fileExists(safeFolder, safeFilename);
      if (!exists) {
        res.status(404).json({ success: false, message: 'File not found in the audit repository.' });
        return;
      }

      const fileData = await storageService.getFileStream(safeFolder, safeFilename);

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
      if (fileData.mimeType) {
        res.setHeader('Content-Type', fileData.mimeType);
      }
      if (fileData.size) {
        res.setHeader('Content-Length', fileData.size);
      }
      fileData.stream.pipe(res);
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async uploadReport(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId, processId, customerId, userId, reportOf, year, date } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: 'No report file uploaded.' });
        return;
      }

      const maxRep = await ComplianceReport.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxRep?.legacyId || 0) + 1;

      const fileObj = file as any;
      const newReport = new ComplianceReport({
        legacyId: nextLegacyId,
        serviceId: Number(serviceId),
        processId,
        customerId,
        userId: userId || req.body.userId,
        reportDocs: file.filename,
        reportOf,
        date: date || new Date().toISOString().split('T')[0],
        year: Number(year) || new Date().getFullYear(),
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageType: fileObj.storageType || (storageService.isS3Enabled() ? 's3' : 'local'),
        s3Url: fileObj.s3Url || '',
        s3Key: fileObj.s3Key || '',
        s3Bucket: fileObj.s3Bucket || '',
        folder: 'report',
      });

      await newReport.save();
      res.status(201).json({ success: true, message: 'Report uploaded successfully.', report: newReport });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const fileController = new FileController();
