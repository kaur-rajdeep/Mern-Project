import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  ComplianceProject,
  TestingProject,
  ComplianceService,
  TestingService,
  Questionnaire,
  EvidenceReview,
  EvidenceDocument,
  AssessorDocument,
  AuditComment,
  User,
  CustomerProcess,
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { formatErrorMessage } from '../utils/formatError';
import { mailService } from '../services/mailService';

export class QsaController {
  public async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const qsaId = req.user!._id;

      const [complianceProjects, testingProjects] = await Promise.all([
        ComplianceProject.find({ qsaId })
          .populate('customerId', 'fullName companyName email')
          .populate('processId', 'processName')
          .sort({ createdAt: -1 }),
        TestingProject.find({ qsaId })
          .populate('customerId', 'fullName companyName email')
          .populate('processId', 'processName')
          .sort({ createdAt: -1 }),
      ]);

      const [services, testings] = await Promise.all([
        ComplianceService.find({ status: 1 }),
        TestingService.find({ status: 1 }),
      ]);

      res.status(200).json({
        success: true,
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

  public async getAuditView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, customerId } = req.query;
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        qsaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      const questionnaires = await Questionnaire.find({ serviceId: numServiceId, status: '1' }).sort({ legacyId: 1 });

      const [reviews, customerDocs, assessorDocs, comments] = await Promise.all([
        EvidenceReview.find({ processId, serviceId: numServiceId, customerId }),
        EvidenceDocument.find({ processId, serviceId: numServiceId, customerId }),
        AssessorDocument.find({ processId, serviceId: numServiceId, customerId }).populate('userId', 'fullName userType'),
        AuditComment.find({ processId, serviceId: numServiceId, customerId })
          .populate('loginUserId', 'fullName userType email')
          .sort({ createdAt: 1 }),
      ]);

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

  public async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, customerId, questionnaireId, status, allStatus, updates, comment } = req.body;
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        qsaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      const itemsToUpdate: Array<{ questionnaireId: any; status?: any; allStatus?: any; comment?: string }> = [];

      if (Array.isArray(updates) && updates.length > 0) {
        itemsToUpdate.push(...updates);
      } else if (questionnaireId) {
        itemsToUpdate.push({ questionnaireId, status, allStatus, comment });
      }

      if (itemsToUpdate.length === 0) {
        res.status(400).json({ success: false, message: 'No status updates provided.' });
        return;
      }

      for (const item of itemsToUpdate) {
        const qId = item.questionnaireId;
        const numStatus = Number(item.status ?? 0);
        let calcAllStatus = item.allStatus !== undefined ? Number(item.allStatus) : 0;
        let firstStatus = 1;

        if (numStatus === 1) {
          calcAllStatus = 1; // Assigned to QA
          firstStatus = 1;
        } else if (numStatus === 2) {
          calcAllStatus = 2; // Disapproved by QSA
          firstStatus = 1;
        } else if (numStatus === 4) {
          calcAllStatus = 3; // Marked Incomplete by QSA
          firstStatus = 3;
        }

        let review = await EvidenceReview.findOne({
          processId,
          serviceId: numServiceId,
          questionnaireId: qId,
          customerId,
        });

        if (!review) {
          review = new EvidenceReview({
            processId,
            serviceId: numServiceId,
            questionnaireId: qId,
            customerId,
            questCheckedVal: 'on',
            status: numStatus,
            allStatus: calcAllStatus,
            firstStatus,
            qsaId: req.user?._id,
            statusDate: new Date(),
            allStatusDate: new Date(),
          });
        } else {
          review.status = numStatus;
          review.allStatus = calcAllStatus;
          review.firstStatus = firstStatus;
          review.qsaId = req.user?._id;
          review.statusDate = new Date();
          review.allStatusDate = new Date();
          review.qsaDate = new Date().toISOString();
        }

        await review.save();

        const comm = item.comment || comment;
        if (comm && comm.trim()) {
          await AuditComment.create({
            questionId: qId,
            serviceId: numServiceId,
            processId,
            customerId,
            loginUserId: req.user!._id,
            comments: comm.trim(),
            loginUserDate: new Date(),
          });
        }
      }

      // Notify customer if any controls were Disapproved or Marked Incomplete (Strictly NO email if Approved)
      const nonApprovedUpdates = itemsToUpdate.filter((it) => Number(it.status) === 2 || Number(it.status) === 4);
      if (nonApprovedUpdates.length > 0) {
        (async () => {
          try {
            const [customer, processObj, serviceObj] = await Promise.all([
              User.findById(customerId),
              CustomerProcess.findById(processId),
              ComplianceService.findOne({ legacyId: numServiceId }),
            ]);

            if (customer?.email) {
              const procName = processObj?.processName || 'General Process';
              const servName = serviceObj?.serviceName || `Service #${numServiceId}`;
              const firstItem = nonApprovedUpdates[0];
              const qObj = await Questionnaire.findById(firstItem.questionnaireId);
              const controlCode = qObj?.legacyId ? `Requirement #${qObj.legacyId}` : (qObj?.question ? (qObj.question.length > 60 ? qObj.question.substring(0, 60) + '...' : qObj.question) : 'Control Item');
              const statusName = Number(firstItem.status) === 2 ? 'Disapproved by QSA' : 'Marked Incomplete by QSA';
              const remarks = firstItem.comment || comment || undefined;

              const label = nonApprovedUpdates.length > 1
                ? `${controlCode} (and ${nonApprovedUpdates.length - 1} other control(s))`
                : controlCode;

              await mailService.sendReviewStatusMail(
                customer.email,
                customer.companyName || customer.fullName,
                procName,
                servName,
                label,
                statusName,
                'QSA Assessor',
                req.user?.fullName || 'QSA Auditor',
                remarks
              );
            }
          } catch (mailErr) {
            console.error('Failed to dispatch QSA review status email:', mailErr);
          }
        })();
      }

      res.status(200).json({ success: true, message: 'Status updated successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async uploadSupplementary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, questionnaireId, customerId } = req.body;
      const files = req.files as Express.Multer.File[];
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        qsaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No files uploaded.' });
        return;
      }

      const savedDocs = [];
      for (const file of files) {
        const doc = new AssessorDocument({
          questionnaireId,
          serviceId: numServiceId,
          processId,
          customerId,
          userId: req.user!._id,
          docs: file.filename,
          originalFilename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
        await doc.save();
        await doc.populate('userId', 'fullName userType');
        savedDocs.push(doc);
      }

      res.status(200).json({
        success: true,
        message: 'Supplementary documents uploaded.',
        documents: savedDocs,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async deleteSupplementary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      let query: any = {};
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        query = { _id: id };
      } else if (!isNaN(Number(id))) {
        query = { legacyId: Number(id) };
      } else {
        query = { docs: id };
      }

      const doc = await AssessorDocument.findOne({ ...query, userId: req.user!._id });
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found or you are not authorized to delete it.' });
        return;
      }

      const filePath = path.resolve(__dirname, '../../../uploads/qsa', doc.docs);
      try {
        await fs.promises.unlink(filePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn('Could not unlink qsa file:', err);
        }
      }

      await AssessorDocument.deleteOne({ _id: doc._id });
      res.status(200).json({ success: true, message: 'Supplementary document deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async requestModification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, questionnaireId, customerId } = req.body;

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: Number(serviceId),
        customerId,
        qsaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }
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
          questCheckedVal: 'off',
          status: 0,
          allStatus: 0,
        });
      }

      review.qsaModification = 1;
      review.qsaDate = new Date().toISOString();
      await review.save();

      res.status(200).json({ success: true, message: 'Modification request submitted to Admin.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const qsaController = new QsaController();
