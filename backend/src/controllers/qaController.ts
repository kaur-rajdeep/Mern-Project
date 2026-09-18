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
  CustomerProcess,
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { formatErrorMessage } from '../utils/formatError';
import { mailService } from '../services/mailService';
import { storageService } from '../services/storageService';

export class QaController {
  public async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const qaId = req.user!._id;

      const [complianceProjects, testingProjects] = await Promise.all([
        ComplianceProject.find({ qaId })
          .populate('customerId', 'fullName companyName email')
          .populate('processId', 'processName')
          .sort({ createdAt: -1 }),
        TestingProject.find({ qaId })
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
        qaId: req.user!._id,
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
      const { processId, serviceId, questionnaireId, customerId, status } = req.body;
      const numStatus = Number(status); // 1 = Approved, 2 = Disapproved, 3 = Pending with Customer
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        qaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

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
        });
      }

      review.qaStatus = numStatus;
      review.qaStatusDate = new Date();
      review.qaId = req.user!._id;

      // Status translation matching legacy CodeIgniter Qa.php:
      // 1 = QA Approved => allStatus = 4
      // 2 = QA Disapproved => allStatus = 5
      // 4 = QA Incomplete => allStatus = 6
      if (numStatus === 1) {
        review.firstStatus = 2;
        review.allStatus = 4; // QA Approved
      } else if (numStatus === 2) {
        review.firstStatus = 4;
        review.allStatus = 5; // QA Disapproved
      } else if (numStatus === 4 || numStatus === 3) {
        review.firstStatus = 6;
        review.allStatus = 6; // QA Incomplete
      }
      review.allStatusDate = new Date();

      await review.save();

      // When QA disapproves or marks incomplete: send a SINGLE COMMON EMAIL to Customer, QSA, and Consultant
      if (numStatus !== 1) {
        (async () => {
          try {
            const [proj, processObj, serviceObj, qObj] = await Promise.all([
              ComplianceProject.findOne({ processId, serviceId: numServiceId, customerId })
                .populate('customerId', 'fullName companyName email')
                .populate('qsaId', 'fullName email')
                .populate('consultantId', 'fullName email'),
              CustomerProcess.findById(processId),
              ComplianceService.findOne({ legacyId: numServiceId }),
              Questionnaire.findById(questionnaireId),
            ]);

            const recipients: string[] = [];
            const recipientNamesList: string[] = [];

            const customerUser = proj?.customerId as any;
            const qsaUser = proj?.qsaId as any;
            const consultantUser = proj?.consultantId as any;

            if (customerUser?.email) {
              recipients.push(customerUser.email);
              recipientNamesList.push(customerUser.companyName || customerUser.fullName);
            }
            if (qsaUser?.email && !recipients.includes(qsaUser.email)) {
              recipients.push(qsaUser.email);
              recipientNamesList.push(`${qsaUser.fullName} (QSA)`);
            }
            if (consultantUser?.email && !recipients.includes(consultantUser.email)) {
              recipients.push(consultantUser.email);
              recipientNamesList.push(`${consultantUser.fullName} (Consultant)`);
            }

            if (recipients.length > 0) {
              const procName = processObj?.processName || 'General Process';
              const servName = serviceObj?.serviceName || `Service #${numServiceId}`;
              const controlCode = qObj?.legacyId ? `Requirement #${qObj.legacyId}` : (qObj?.question ? (qObj.question.length > 60 ? qObj.question.substring(0, 60) + '...' : qObj.question) : 'Control Item');
              const statusName = numStatus === 2 ? 'Disapproved by QA' : 'Marked Incomplete by QA';

              await mailService.sendReviewStatusMail(
                recipients,
                recipientNamesList.join(', '),
                procName,
                servName,
                controlCode,
                statusName,
                'Quality Assurance (QA) Reviewer',
                req.user?.fullName || 'QA Auditor'
              );
            }
          } catch (mailErr) {
            console.error('Failed to dispatch QA review status common email:', mailErr);
          }
        })();
      }

      res.status(200).json({ success: true, message: 'QA status updated successfully.', review });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async bulkUpdateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { processId, serviceId, customerId, questionnaireIds, status } = req.body;
      const numStatus = Number(status);
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        qaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      if (!Array.isArray(questionnaireIds) || questionnaireIds.length === 0) {
        res.status(400).json({ success: false, message: 'No requirements selected.' });
        return;
      }

      let allStatusVal = 4; // QA Approved
      if (numStatus === 2) allStatusVal = 5; // QA Disapproved
      if (numStatus === 4 || numStatus === 3) allStatusVal = 6; // QA Incomplete

      if (questionnaireIds && questionnaireIds.length > 0) {
        const now = new Date();
        const firstStatusVal = numStatus === 1 ? 2 : numStatus === 2 ? 4 : 6;
        const operations = questionnaireIds.map((qId: any) => ({
          updateOne: {
            filter: { processId, serviceId: numServiceId, questionnaireId: qId, customerId },
            update: {
              $set: {
                qaStatus: numStatus,
                qaStatusDate: now,
                qaId: req.user!._id,
                firstStatus: firstStatusVal,
                allStatus: allStatusVal,
                allStatusDate: now,
              },
            },
            upsert: true,
          },
        }));
        await EvidenceReview.bulkWrite(operations);
      }

      // When QA bulk disapproves or marks incomplete: send a SINGLE COMMON EMAIL to Customer, QSA, and Consultant
      if (numStatus !== 1 && questionnaireIds && questionnaireIds.length > 0) {
        (async () => {
          try {
            const [proj, processObj, serviceObj, firstQ] = await Promise.all([
              ComplianceProject.findOne({ processId, serviceId: numServiceId, customerId })
                .populate('customerId', 'fullName companyName email')
                .populate('qsaId', 'fullName email')
                .populate('consultantId', 'fullName email'),
              CustomerProcess.findById(processId),
              ComplianceService.findOne({ legacyId: numServiceId }),
              Questionnaire.findById(questionnaireIds[0]),
            ]);

            const recipients: string[] = [];
            const recipientNamesList: string[] = [];

            const customerUser = proj?.customerId as any;
            const qsaUser = proj?.qsaId as any;
            const consultantUser = proj?.consultantId as any;

            if (customerUser?.email) {
              recipients.push(customerUser.email);
              recipientNamesList.push(customerUser.companyName || customerUser.fullName);
            }
            if (qsaUser?.email && !recipients.includes(qsaUser.email)) {
              recipients.push(qsaUser.email);
              recipientNamesList.push(`${qsaUser.fullName} (QSA)`);
            }
            if (consultantUser?.email && !recipients.includes(consultantUser.email)) {
              recipients.push(consultantUser.email);
              recipientNamesList.push(`${consultantUser.fullName} (Consultant)`);
            }

            if (recipients.length > 0) {
              const procName = processObj?.processName || 'General Process';
              const servName = serviceObj?.serviceName || `Service #${numServiceId}`;
              const controlCode = firstQ?.legacyId ? `Requirement #${firstQ.legacyId}` : (firstQ?.question ? (firstQ.question.length > 60 ? firstQ.question.substring(0, 60) + '...' : firstQ.question) : 'Control Item');
              const label = questionnaireIds.length > 1 ? `${controlCode} (and ${questionnaireIds.length - 1} other controls)` : controlCode;
              const statusName = numStatus === 2 ? 'Disapproved by QA' : 'Marked Incomplete by QA';

              await mailService.sendReviewStatusMail(
                recipients,
                recipientNamesList.join(', '),
                procName,
                servName,
                label,
                statusName,
                'Quality Assurance (QA) Reviewer',
                req.user?.fullName || 'QA Auditor'
              );
            }
          } catch (mailErr) {
            console.error('Failed to dispatch QA bulk review status common email:', mailErr);
          }
        })();
      }

      res.status(200).json({ success: true, message: 'QA batch status updated successfully.' });
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
        qaId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No files provided.' });
        return;
      }

      const savedDocs = [];
      for (const file of files) {
        const fileObj = file as any;
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
          storageType: fileObj.storageType || (storageService.isS3Enabled() ? 's3' : 'local'),
          s3Url: fileObj.s3Url || '',
          s3Key: fileObj.s3Key || '',
          s3Bucket: fileObj.s3Bucket || '',
          folder: 'qa',
        });
        await doc.save();
        savedDocs.push(doc);
      }

      res.status(200).json({ success: true, message: 'QA documents uploaded successfully.', documents: savedDocs });
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

      await storageService.deleteFile('qa', doc.docs);

      await AssessorDocument.deleteOne({ _id: doc._id });
      res.status(200).json({ success: true, message: 'Document deleted successfully.' });
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
        qaId: req.user!._id,
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

      review.qaModification = 1;
      review.qaDate = new Date();
      await review.save();

      res.status(200).json({ success: true, message: 'Modification request submitted to Admin.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const qaController = new QaController();
