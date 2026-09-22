import { Request, Response } from 'express';
import {
  Questionnaire,
  EvidenceReview,
  ComplianceProject,
  ComplianceService,
  TestingProject,
  TestingService,
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserType } from '../constants/roles';

/**
 * Standalone helper — extracted outside the class to avoid `this`-binding
 * issues when Express calls class methods as bare function references.
 */
async function computeEngagementStats(
  numServiceId: number,
  customerId: string,
  processId: string
) {
  const totalQuestions = await Questionnaire.countDocuments({
    serviceId: numServiceId,
    status: '1',
  });

  const reviews = await EvidenceReview.find({
    serviceId: numServiceId,
    customerId,
    processId,
  });

  const attempted = reviews.filter((r) => r.questCheckedVal === 'on').length;
  const notAttempted = Math.max(0, totalQuestions - attempted);

  const assignedToQsa = reviews.filter((r) => r.status === 0 || r.firstStatus === 1).length;
  const assignedToQa = reviews.filter((r) => r.status === 1).length;
  const approvedByQa = reviews.filter((r) => r.qaStatus === 1).length;
  const disapprovedByQsa = reviews.filter((r) => r.status === 2).length;
  const disapprovedByQa = reviews.filter((r) => r.qaStatus === 2).length;
  const markedIncomplete = reviews.filter((r) => r.qaStatus === 4 || r.status === 4).length;

  // "Needs your action" = disapproved by QSA + disapproved by QA + marked incomplete
  const needsAction = disapprovedByQsa + disapprovedByQa + markedIncomplete;
  // "In review" = assigned to QSA + assigned to QA
  const inReview = assignedToQsa + assignedToQa;

  return {
    totalQuestions,
    attempted,
    notAttempted,
    assignedToQsa,
    assignedToQa,
    approvedByQa,
    disapprovedByQsa,
    disapprovedByQa,
    markedIncomplete,
    needsAction,
    inReview,
  };
}

export class AnalyticsController {
  public getProcessStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { serviceId, customerId: reqCustomerId, processId } = req.body;
      const user = req.user;
      const numServiceId = Number(serviceId);

      let targetCustomerId = reqCustomerId;

      // MED-01: Multi-tenant scoping and project assignment verification
      if (user) {
        if (user.userType === UserType.CUSTOMER) {
          // Strict tenant scoping: Customer can ONLY query their own organization's stats
          targetCustomerId = (user.parentId || user._id).toString();
        } else if (
          user.userType === UserType.QSA ||
          user.userType === UserType.QA ||
          user.userType === UserType.CONSULTANT
        ) {
          // Assessor scoping: Verify project assignment
          const isAssigned = await ComplianceProject.exists({
            processId,
            serviceId: numServiceId,
            customerId: targetCustomerId,
            $or: [
              { qsaId: user._id },
              { qaId: user._id },
              { consultantId: user._id },
            ],
          });
          if (!isAssigned) {
            res.status(403).json({
              success: false,
              message: 'Forbidden. You are not assigned to this compliance project.',
            });
            return;
          }
        }
      }

      const totalQuestions = await Questionnaire.countDocuments({ serviceId: numServiceId, status: '1' });

      const reviews = await EvidenceReview.find({
        serviceId: numServiceId,
        customerId: targetCustomerId,
        processId,
      });

      const attempted = reviews.filter((r) => r.questCheckedVal === 'on').length;
      const notAttempted = Math.max(0, totalQuestions - attempted);

      const assignedToQsa = reviews.filter((r) => r.status === 0 || r.firstStatus === 1).length;
      const assignedToQa = reviews.filter((r) => r.status === 1).length;
      const approvedByQa = reviews.filter((r) => r.qaStatus === 1).length;
      const disapprovedByQsa = reviews.filter((r) => r.status === 2).length;
      const disapprovedByQa = reviews.filter((r) => r.qaStatus === 2).length;
      const markedIncomplete = reviews.filter((r) => r.qaStatus === 4 || r.status === 4).length;

      // Legacy CSV string format for strict parity:
      // "Total, Attempted, Rejected, Approved, Approved+Rejected, AssignedToQSA, AssignedToQA, Incomplete, DisapprovedByQSA, DisapprovedByQA"
      const csvString = `${totalQuestions},${attempted},${disapprovedByQa + disapprovedByQsa},${approvedByQa},${approvedByQa + disapprovedByQa},${assignedToQsa},${assignedToQa},${markedIncomplete},${disapprovedByQsa},${disapprovedByQa}`;

      res.status(200).json({
        success: true,
        stats: {
          totalQuestions,
          attempted,
          notAttempted,
          assignedToQsa,
          assignedToQa,
          approvedByQa,
          disapprovedByQsa,
          disapprovedByQa,
          markedIncomplete,
        },
        csvString,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Returns a full process dashboard summary with per-engagement stats.
   * Includes BOTH compliance frameworks AND testing engagements that are
   * currently active (status = 0) within the specified process.
   * Used by the new customer ProcessDetailsPage.
   *
   * Defined as an arrow function property so `this` is always bound correctly
   * when Express calls it as a bare route handler reference.
   */
  public getProcessDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { processId } = req.body;
      const user = req.user!;
      const customerId = (user.parentId || user._id).toString();

      // ── 1. Active Compliance Projects ─────────────────────────────────────
      const complianceProjects = await ComplianceProject.find({
        processId,
        customerId,
        status: 0, // active only
      })
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email');

      const complianceServiceIds = complianceProjects.map((cp) => cp.serviceId);
      const complianceServices = await ComplianceService.find({
        legacyId: { $in: complianceServiceIds },
      });

      // ── 2. Active Testing Projects ─────────────────────────────────────────
      const testingProjects = await TestingProject.find({
        processId,
        customerId,
        status: 0, // active only
      })
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email');

      const testingServiceIds = testingProjects.map((tp) => tp.testingId);
      const testingServices = await TestingService.find({
        legacyId: { $in: testingServiceIds },
      });

      // ── 3. Build per-engagement stats ──────────────────────────────────────

      // Compliance engagements
      const complianceEngagements = await Promise.all(
        complianceProjects.map(async (cp) => {
          const cpObj = cp.toObject() as any;
          const serviceName =
            complianceServices.find((s) => s.legacyId === cp.serviceId)?.serviceName ||
            `Service #${cp.serviceId}`;
          const stats = await computeEngagementStats(
            Number(cp.serviceId),
            customerId,
            processId
          );
          return {
            _id: cpObj._id.toString(),
            engagementId: cp.serviceId, // used for the evidence-audit link
            engagementType: 'compliance' as const,
            engagementName: serviceName,
            startDate: cpObj.startDate,
            endDate: cpObj.endDate,
            qsaId: cpObj.qsaId,
            qaId: cpObj.qaId,
            consultantId: cpObj.consultantId,
            stats,
          };
        })
      );

      // Testing engagements
      const testingEngagements = await Promise.all(
        testingProjects.map(async (tp) => {
          const tpObj = tp.toObject() as any;
          const testingName =
            testingServices.find((s) => s.legacyId === tp.testingId)?.testingName ||
            `Testing #${tp.testingId}`;
          const stats = await computeEngagementStats(
            Number(tp.testingId),
            customerId,
            processId
          );
          return {
            _id: tpObj._id.toString(),
            engagementId: tp.testingId, // used for the evidence-audit link
            engagementType: 'testing' as const,
            engagementName: testingName,
            startDate: tpObj.startDate,
            endDate: tpObj.endDate,
            qsaId: tpObj.qsaId,
            qaId: tpObj.qaId,
            consultantId: tpObj.consultantId,
            stats,
          };
        })
      );

      // Merge: compliance first, then testing
      const allEngagements = [...complianceEngagements, ...testingEngagements];

      // ── 4. Aggregate totals ────────────────────────────────────────────────
      const totalEngagements = allEngagements.length;
      const totalQuestions = allEngagements.reduce((s, e) => s + e.stats.totalQuestions, 0);
      const totalAttempted = allEngagements.reduce((s, e) => s + e.stats.attempted, 0);
      const totalNeedsAction = allEngagements.reduce((s, e) => s + e.stats.needsAction, 0);

      res.status(200).json({
        success: true,
        summary: {
          totalEngagements,
          totalQuestions,
          totalAttempted,
          totalNeedsAction,
        },
        // Keep backward-compat key "services" so the frontend doesn't need a rename
        services: allEngagements,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

export const analyticsController = new AnalyticsController();
