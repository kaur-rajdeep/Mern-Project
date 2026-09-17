import { Response } from 'express';
import { AuditComment, CustomerProcess, ComplianceProject, User, ComplianceService, Questionnaire } from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';
import { formatErrorMessage } from '../utils/formatError';
import { mailService } from '../services/mailService';

export class CommentController {
  public async addComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      let { questionId, serviceId, processId, customerId, comment } = req.body;
      const user = req.user!;
      const numServiceId = Number(serviceId);

      if (!comment || !comment.trim()) {
        res.status(400).json({ success: false, message: 'Comment text is required.' });
        return;
      }

      // Fallback for questionId / questionnaireId naming
      const targetQuestionId = questionId || req.body.questionnaireId;
      if (!targetQuestionId) {
        res.status(400).json({ success: false, message: 'Question ID is required.' });
        return;
      }

      // Enforce strict multi-tenant customer scoping
      if (user.userType === UserType.CUSTOMER) {
        customerId = user.parentId || user._id;
      } else if (!customerId || customerId === '') {
        if (processId) {
          const proc = await CustomerProcess.findById(processId);
          if (proc) {
            customerId = proc.customerId;
          }
        }
      }

      // Verify Assessor project assignment before adding comment
      if (user.userType === UserType.QSA) {
        const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId, qsaId: user._id });
        if (!assigned) {
          res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
          return;
        }
      } else if (user.userType === UserType.QA) {
        const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId, qaId: user._id });
        if (!assigned) {
          res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
          return;
        }
      } else if (user.userType === UserType.CONSULTANT) {
        const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId, consultantId: user._id });
        if (!assigned) {
          res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
          return;
        }
      }

      const newComment = new AuditComment({
        questionId: targetQuestionId,
        serviceId: numServiceId,
        processId,
        customerId,
        loginUserId: user._id,
        comments: comment.trim(),
        loginUserDate: new Date(),
      });

      await newComment.save();
      await newComment.populate('loginUserId', 'fullName userType email');

      // Dispatch notification email to counterparts
      (async () => {
        try {
          const [proj, customerUser, processObj, serviceObj, qObj] = await Promise.all([
            ComplianceProject.findOne({ processId, serviceId: numServiceId, customerId })
              .populate('customerId', 'fullName companyName email')
              .populate('qsaId', 'fullName email')
              .populate('qaId', 'fullName email')
              .populate('consultantId', 'fullName email'),
            User.findById(customerId),
            CustomerProcess.findById(processId),
            ComplianceService.findOne({ legacyId: numServiceId }),
            Questionnaire.findById(targetQuestionId),
          ]);

          const procName = processObj?.processName || 'General Process';
          const servName = serviceObj?.serviceName || `Service #${numServiceId}`;
          const controlCode = qObj?.legacyId ? `Requirement #${qObj.legacyId}` : (qObj?.question ? (qObj.question.length > 60 ? qObj.question.substring(0, 60) + '...' : qObj.question) : 'Control Item');
          const authorRole =
            user.userType === UserType.CUSTOMER
              ? 'Customer Client'
              : user.userType === UserType.QSA
              ? 'QSA Auditor'
              : user.userType === UserType.QA
              ? 'QA Reviewer'
              : user.userType === UserType.CONSULTANT
              ? 'Security Consultant'
              : 'Panacea Admin';

          if (user.userType === UserType.CUSTOMER) {
            // Customer commented -> Notify assigned QSA and Consultant
            const qsaUser = proj?.qsaId as any;
            const consultantUser = proj?.consultantId as any;
            if (qsaUser?.email) {
              await mailService.sendAuditCommentMail(
                qsaUser.email,
                qsaUser.fullName,
                user.fullName,
                authorRole,
                procName,
                servName,
                controlCode,
                comment.trim()
              );
            }
            if (consultantUser?.email) {
              await mailService.sendAuditCommentMail(
                consultantUser.email,
                consultantUser.fullName,
                user.fullName,
                authorRole,
                procName,
                servName,
                controlCode,
                comment.trim()
              );
            }
          } else {
            // Assessor or Admin commented -> Notify customer
            const targetCustomer = (proj?.customerId as any) || customerUser;
            if (targetCustomer?.email) {
              await mailService.sendAuditCommentMail(
                targetCustomer.email,
                targetCustomer.companyName || targetCustomer.fullName,
                user.fullName,
                authorRole,
                procName,
                servName,
                controlCode,
                comment.trim()
              );
            }
          }
        } catch (mailErr) {
          console.error('Failed to dispatch comment notification email:', mailErr);
        }
      })();

      res.status(201).json({ success: true, message: 'Comment posted.', comment: newComment });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getComments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { questionId, questionnaireId, serviceId, processId } = req.query;
      let customerId = req.query.customerId as string;
      const user = req.user!;
      const numServiceId = Number(serviceId);

      const targetQuestionId = questionId || questionnaireId;

      const query: any = {
        questionId: targetQuestionId,
        serviceId: numServiceId,
        processId,
      };

      // Strict tenant isolation: customer can ONLY access their own comments
      if (user.userType === UserType.CUSTOMER) {
        query.customerId = user.parentId || user._id;
      } else {
        if (customerId && customerId !== '') {
          query.customerId = customerId;
        }

        // Verify Assessor project assignment before returning comments
        if (user.userType === UserType.QSA) {
          const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId: query.customerId, qsaId: user._id });
          if (!assigned) {
            res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
            return;
          }
        } else if (user.userType === UserType.QA) {
          const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId: query.customerId, qaId: user._id });
          if (!assigned) {
            res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
            return;
          }
        } else if (user.userType === UserType.CONSULTANT) {
          const assigned = await ComplianceProject.exists({ processId, serviceId: numServiceId, customerId: query.customerId, consultantId: user._id });
          if (!assigned) {
            res.status(403).json({ success: false, message: 'Forbidden. You are not assigned to this compliance project.' });
            return;
          }
        }
      }

      const comments = await AuditComment.find(query)
        .populate('loginUserId', 'fullName userType email')
        .sort({ createdAt: 1 });

      res.status(200).json({ success: true, comments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const commentController = new CommentController();


