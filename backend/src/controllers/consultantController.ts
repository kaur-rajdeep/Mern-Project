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
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { formatErrorMessage } from '../utils/formatError';
import { storageService } from '../services/storageService';

export class ConsultantController {
  public async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.user!._id;

      const [complianceProjects, testingProjects] = await Promise.all([
        ComplianceProject.find({ consultantId })
          .populate('customerId', 'fullName companyName email')
          .populate('processId', 'processName')
          .sort({ createdAt: -1 }),
        TestingProject.find({ consultantId })
          .populate('customerId', 'fullName companyName email')
          .populate('processId', 'processName')
          .sort({ createdAt: -1 }),
      ]);

      const serviceIds = complianceProjects.map((cp) => cp.serviceId);
      const services = await ComplianceService.find({ legacyId: { $in: serviceIds } });

      const testingIds = testingProjects.map((tp) => tp.testingId);
      const testings = await TestingService.find({ legacyId: { $in: testingIds } });

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
        consultantId: req.user!._id,
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
          .populate('loginUserId', 'fullName userType')
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
      const numStatus = Number(status);
      const numServiceId = Number(serviceId);

      const isAssigned = await ComplianceProject.exists({
        processId,
        serviceId: numServiceId,
        customerId,
        consultantId: req.user!._id,
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

      review.consultantStatus = numStatus;
      review.consultantStatusDate = new Date().toISOString();
      review.consultantId = req.user!._id;
      review.firstStatus = 5; // Consultant stage

      await review.save();
      res.status(200).json({ success: true, message: 'Consultant status updated successfully.', review });
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
        consultantId: req.user!._id,
      });

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
        return;
      }

      if (questionnaireIds && questionnaireIds.length > 0) {
        const nowStr = new Date().toISOString();
        const operations = questionnaireIds.map((qId: any) => ({
          updateOne: {
            filter: { processId, serviceId: numServiceId, questionnaireId: qId, customerId },
            update: {
              $set: {
                consultantStatus: numStatus,
                consultantStatusDate: nowStr,
                consultantId: req.user!._id,
                firstStatus: 5,
              },
            },
            upsert: true,
          },
        }));
        await EvidenceReview.bulkWrite(operations);
      }

      res.status(200).json({ success: true, message: 'Consultant batch status updated successfully.' });
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
        consultantId: req.user!._id,
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
          folder: 'consultants',
        });
        await doc.save();
        savedDocs.push(doc);
      }

      res.status(200).json({ success: true, message: 'Consultant documents uploaded successfully.', documents: savedDocs });
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

      await storageService.deleteFile('consultants', doc.docs);

      await AssessorDocument.deleteOne({ _id: doc._id });
      res.status(200).json({ success: true, message: 'Document deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const consultantController = new ConsultantController();

