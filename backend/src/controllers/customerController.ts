import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  User,
  CustomerProcess,
  ComplianceProject,
  TestingProject,
  ComplianceService,
  TestingService,
  Questionnaire,
  EvidenceReview,
  EvidenceDocument,
  AssessorDocument,
  AuditComment,
  ComplianceReport,
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { formatErrorMessage } from '../utils/formatError';
import { mailService } from '../services/mailService';
import { storageService } from '../services/storageService';

export class CustomerController {
  public async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const processes = await CustomerProcess.find({ customerId, status: 0 }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, processes, totalProcesses: processes.length });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getProcessServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId } = req.params;
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const process = await CustomerProcess.findById(processId);
      if (!process) {
        res.status(404).json({ success: false, message: 'Process not found.' });
        return;
      }

      // Find compliance services mapped to this process
      const complianceProjects = await ComplianceProject.find({ processId, customerId })
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email');

      // Fetch service names
      const serviceIds = complianceProjects.map((cp) => cp.serviceId);
      const services = await ComplianceService.find({ legacyId: { $in: serviceIds } });

      // Find testing projects mapped to this process
      const testingProjects = await TestingProject.find({ processId, customerId })
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email');

      const testingIds = testingProjects.map((tp) => tp.testingId);
      const testings = await TestingService.find({ legacyId: { $in: testingIds } });

      res.status(200).json({
        success: true,
        process,
        complianceProjects: complianceProjects.map((cp) => ({
          ...cp.toObject(),
          serviceName: services.find((s) => s.legacyId === cp.serviceId)?.serviceName || `Service #${cp.serviceId}`,
        })),
        testingProjects: testingProjects.map((tp) => ({
          ...tp.toObject(),
          testingName: testings.find((t) => t.legacyId === tp.testingId)?.testingName || `Testing #${tp.testingId}`,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getEvidenceAuditView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId } = req.query;
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const safeProcessId = processId ? String(processId) : '';
      const numServiceId = Number(serviceId);
      const questionnaires = await Questionnaire.find({ serviceId: numServiceId, status: '1' }).sort({ legacyId: 1 });

      // Fetch existing reviews
      const reviews = await EvidenceReview.find({
        processId: safeProcessId,
        serviceId: numServiceId,
        customerId,
      });

      // Fetch uploaded customer docs
      const customerDocs = await EvidenceDocument.find({
        processId,
        serviceId: numServiceId,
        customerId,
      });

      // Fetch assessor docs
      const assessorDocs = await AssessorDocument.find({
        processId,
        serviceId: numServiceId,
        customerId,
      }).populate('userId', 'fullName userType');

      // Fetch comments
      const comments = await AuditComment.find({
        processId,
        serviceId: numServiceId,
        customerId,
      })
        .populate('loginUserId', 'fullName userType')
        .sort({ createdAt: 1 });

      const auditData = questionnaires.map((q) => {
        const review = reviews.find((r) => r.questionnaireId.toString() === q._id.toString());
        const docs = customerDocs.filter((d) => d.questionnaireId.toString() === q._id.toString());
        const supDocs = assessorDocs.filter((ad) => ad.questionnaireId.toString() === q._id.toString());
        const qComments = comments.filter((c) => c.questionId.toString() === q._id.toString());

        return {
          question: q,
          review: review || null,
          customerDocs: docs,
          assessorDocs: supDocs,
          comments: qComments,
        };
      });

      res.status(200).json({ success: true, auditData });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async uploadEvidence(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, questionnaireId, comment } = req.body;
      const user = req.user!;
      const customerId = user.parentId || user._id;
      const numServiceId = Number(serviceId);

      const files = req.files as Express.Multer.File[];

      // Upsert EvidenceReview state
      let review = await EvidenceReview.findOne({
        processId,
        serviceId: numServiceId,
        questionnaireId,
        customerId,
      });

      if (!review) {
        review = new EvidenceReview({
          processId,
          serviceId: numServiceId,
          questionnaireId,
          customerId,
          parentId: user.parentId || null,
          questCheckedVal: 'on',
          status: 0,
          allStatus: 0,
        });
      }
      review.questCheckedVal = 'on';
      await review.save();

      // Save uploaded files
      const savedDocs = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const fileObj = file as any;
          const doc = new EvidenceDocument({
            questionnaireId,
            serviceId: numServiceId,
            processId,
            customerId,
            parentId: user.parentId || null,
            docs: file.filename,
            originalFilename: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            storageType: fileObj.storageType || (storageService.isS3Enabled() ? 's3' : 'local'),
            s3Url: fileObj.s3Url || '',
            s3Key: fileObj.s3Key || '',
            s3Bucket: fileObj.s3Bucket || '',
            folder: 'evidence',
          });
          await doc.save();
          savedDocs.push(doc);
        }
      }

      // Add comment if provided
      if (comment && comment.trim()) {
        await AuditComment.create({
          questionId: questionnaireId,
          serviceId: numServiceId,
          processId,
          customerId,
          parentId: user.parentId || null,
          loginUserId: user._id,
          comments: comment.trim(),
          loginUserDate: new Date(),
        });
      }

      // Notify assigned QSA / Consultant of evidence submission
      if (savedDocs.length > 0) {
        (async () => {
          try {
            const [proj, processObj, serviceObj, qObj] = await Promise.all([
              ComplianceProject.findOne({ processId, serviceId: numServiceId, customerId })
                .populate('qsaId', 'fullName email')
                .populate('consultantId', 'fullName email'),
              CustomerProcess.findById(processId),
              ComplianceService.findOne({ legacyId: numServiceId }),
              Questionnaire.findById(questionnaireId),
            ]);

            const customerName = user.companyName || user.fullName || 'Customer';
            const procName = processObj?.processName || 'General Process';
            const servName = serviceObj?.serviceName || `Service #${numServiceId}`;
            const controlCode = qObj?.legacyId ? `Requirement #${qObj.legacyId}` : (qObj?.question ? (qObj.question.length > 60 ? qObj.question.substring(0, 60) + '...' : qObj.question) : 'Control Item');

            if (proj?.qsaId && (proj.qsaId as any).email) {
              await mailService.sendEvidenceSubmissionMail(
                (proj.qsaId as any).email,
                (proj.qsaId as any).fullName,
                customerName,
                procName,
                servName,
                controlCode,
                savedDocs.length
              );
            }
            if (proj?.consultantId && (proj.consultantId as any).email) {
              await mailService.sendEvidenceSubmissionMail(
                (proj.consultantId as any).email,
                (proj.consultantId as any).fullName,
                customerName,
                procName,
                servName,
                controlCode,
                savedDocs.length
              );
            }
          } catch (mailErr) {
            console.error('Failed to dispatch evidence submission notification:', mailErr);
          }
        })();
      }

      res.status(200).json({
        success: true,
        message: 'Evidence documents uploaded successfully.',
        review,
        documents: savedDocs,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async deleteEvidenceDoc(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const doc = await EvidenceDocument.findOne({ _id: id, customerId });
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found or does not belong to your organization.' });
        return;
      }

      // Precondition 2: Audit Trail Integrity Guard (Cannot delete if control is already approved)
      const review = await EvidenceReview.findOne({
        questionnaireId: doc.questionnaireId,
        customerId,
      });

      if (review && (review.allStatus === 1 || review.allStatus === 4 || review.allStatus === 7)) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete evidence for a control that has already been approved by QSA or QA auditor. Please submit a modification request instead.',
        });
        return;
      }

      // Delete file via storageService (handles both S3 and local)
      await storageService.deleteFile('evidence', doc.docs);

      await EvidenceDocument.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Document deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async requestModification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, questionnaireId } = req.body;
      const user = req.user!;
      const customerId = user.parentId || user._id;

      let review = await EvidenceReview.findOne({
        processId,
        serviceId: Number(serviceId),
        questionnaireId,
        customerId,
      });

      if (!review) {
        review = new EvidenceReview({
          processId,
          serviceId: Number(serviceId),
          questionnaireId,
          customerId,
          parentId: user.parentId || null,
          questCheckedVal: 'off',
          status: 0,
          allStatus: 0,
        });
      }

      review.cusModification = 1;
      review.cusModificationDate = new Date();
      await review.save();

      res.status(200).json({ success: true, message: 'Modification request submitted to Admin.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getAttestationYears(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const distinctYears = await ComplianceReport.distinct('year', { customerId });
      res.status(200).json({ success: true, years: distinctYears.sort((a, b) => b - a) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getAttestationReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, processId, serviceId } = req.query;
      const user = req.user!;
      const customerId = user.parentId || user._id;

      const filter: any = { customerId };
      if (year) filter.year = Number(year);
      if (processId) filter.processId = String(processId);
      if (serviceId) filter.serviceId = Number(serviceId);

      const reports = await ComplianceReport.find(filter)
        .populate('processId', 'processName')
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, reports });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const customerController = new CustomerController();

