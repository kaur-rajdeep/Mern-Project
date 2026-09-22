import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  User,
  Role,
  ComplianceService,
  TestingService,
  CustomerProcess,
  SubCustomerAssignment,
  Questionnaire,
  ComplianceProject,
  TestingProject,
  EvidenceReview,
  EvidenceDocument,
  AssessorDocument,
  AuditComment,
  ComplianceReport,
  ArchivedProcess,
  CmsPage,
} from '../models';
import { UserType, UserStatus } from '../constants/roles';
import { mailService } from '../services/mailService';
import { storageService } from '../services/storageService';
import { AuthRequest } from '../middleware/authMiddleware';
import { formatErrorMessage } from '../utils/formatError';
import { createCustomerSchema, createAssessorSchema, validate } from '../middleware/validateRequest';

export class AdminController {
  public async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalCustomers,
        totalQsa,
        totalQa,
        totalConsultants,
        totalComplianceProjects,
        totalTestingProjects,
        totalActiveProcesses,
      ] = await Promise.all([
        User.countDocuments({ userType: UserType.CUSTOMER, parentId: null, status: { $ne: UserStatus.DELETE } }),
        User.countDocuments({ userType: UserType.QSA, status: { $ne: UserStatus.DELETE } }),
        User.countDocuments({ userType: UserType.QA, status: { $ne: UserStatus.DELETE } }),
        User.countDocuments({ userType: UserType.CONSULTANT, status: { $ne: UserStatus.DELETE } }),
        ComplianceProject.countDocuments(),
        TestingProject.countDocuments(),
        CustomerProcess.countDocuments({ status: 0 }),
      ]);

      res.status(200).json({
        success: true,
        stats: {
          totalCustomers,
          totalQsa,
          totalQa,
          totalConsultants,
          totalComplianceProjects,
          totalTestingProjects,
          totalActiveProcesses,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Customers ---
  public async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await User.find({
        userType: UserType.CUSTOMER,
        parentId: null,
        status: { $ne: UserStatus.DELETE },
      }).sort({ createdAt: -1 });

      res.status(200).json({ success: true, customers });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, phoneNumber, companyName, companyNumber, address, password } = req.body;

      // Validate all input fields
      const validation = validate(createCustomerSchema, req.body);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email address is already in use.' });
        return;
      }

      if (companyNumber && companyNumber.trim() !== '') {
        const existingCompany = await User.findOne({ companyNumber: companyNumber.trim() });
        if (existingCompany) {
          res.status(400).json({ success: false, message: 'Company ID is already in use by another organization.' });
          return;
        }
      }

      const rawPassword = password || crypto.randomBytes(8).toString('base64url');
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Find max legacyId to assign sequentially
      const maxUser = await User.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxUser?.legacyId || 0) + 1;

      const newUser = new User({
        legacyId: nextLegacyId,
        fullName,
        email: email.toLowerCase().trim(),
        phoneNumber,
        companyName,
        companyNumber,
        address,
        passwordHash,
        legacyMd5Hash: '',
        userType: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
      });

      await newUser.save();

      await mailService.sendAccountWelcomeMail(newUser.email, newUser.fullName, rawPassword, 'Customer Organization');

      res.status(201).json({ success: true, message: 'Customer created successfully.', customer: newUser });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fullName, phoneNumber, companyName, companyNumber, address, status, password } = req.body;

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }

      if (companyNumber !== undefined && companyNumber.trim() !== '' && companyNumber !== user.companyNumber) {
        const existingCompany = await User.findOne({ companyNumber: companyNumber.trim(), _id: { $ne: user._id } });
        if (existingCompany) {
          res.status(400).json({ success: false, message: 'Company ID is already in use by another organization.' });
          return;
        }
      }

      if (fullName) user.fullName = fullName;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      if (companyName !== undefined) user.companyName = companyName;
      if (companyNumber !== undefined) user.companyNumber = companyNumber;
      if (address !== undefined) user.address = address;
      if (status) user.status = status;

      if (password) {
        user.passwordHash = await bcrypt.hash(password, 10);
        user.legacyMd5Hash = '';
      }

      await user.save();
      res.status(200).json({ success: true, message: 'Customer updated successfully.', customer: user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }
      user.status = UserStatus.DELETE;
      await user.save();
      res.status(200).json({ success: true, message: 'Customer account deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { adminPassword, sendEmail } = req.body;
      const { id } = req.params;
      const adminUser = req.user;

      if (!adminUser) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const isMatch = await bcrypt.compare(adminPassword, adminUser.passwordHash);
      if (!isMatch) {
        res.status(403).json({ success: false, message: 'Invalid Admin password.' });
        return;
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'Target user not found.' });
        return;
      }

      const temporaryPassword = crypto.randomBytes(8).toString('base64url');
      targetUser.passwordHash = await bcrypt.hash(temporaryPassword, 10);
      targetUser.legacyMd5Hash = '';

      await targetUser.save();

      if (sendEmail) {
        await mailService.sendPasswordResetMail(targetUser.email, targetUser.fullName, temporaryPassword);
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully.',
        password: temporaryPassword,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Customer Processes ---
  public async getProcessesByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const processes = await CustomerProcess.find({ customerId, status: 0 }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, processes });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async addCustomerProcess(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, processName } = req.body;
      const maxProc = await CustomerProcess.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxProc?.legacyId || 0) + 1;

      const newProcess = new CustomerProcess({
        legacyId: nextLegacyId,
        customerId,
        processName,
        status: 0,
      });
      await newProcess.save();
      res.status(201).json({ success: true, message: 'Process added successfully.', process: newProcess });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async archiveProcess(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const process = await CustomerProcess.findById(id);
      if (!process) {
        res.status(404).json({ success: false, message: 'Process not found.' });
        return;
      }

      process.status = 1; // Mark archived
      await process.save();

      await ArchivedProcess.create({
        processId: process._id,
        legacyProcessId: process.legacyId,
      });

      res.status(200).json({ success: true, message: 'Process moved to archive successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getArchivedProcesses(req: Request, res: Response): Promise<void> {
    try {
      const archives = await ArchivedProcess.find()
        .populate({
          path: 'processId',
          populate: { path: 'customerId', select: 'fullName companyName' },
        })
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, archives });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Assessors (QSA, QA, Consultant) ---
  public async getAssessors(req: Request, res: Response): Promise<void> {
    try {
      const { userType } = req.query;
      const filter: any = { status: { $ne: UserStatus.DELETE } };
      if (userType) {
        filter.userType = Number(userType);
      } else {
        filter.userType = { $in: [UserType.QSA, UserType.QA, UserType.CONSULTANT] };
      }

      const assessors = await User.find(filter).sort({ createdAt: -1 });
      res.status(200).json({ success: true, assessors });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async createAssessor(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, phoneNumber, userType, password } = req.body;

      // Validate all input fields
      const validation = validate(createAssessorSchema, { ...req.body, userType: Number(userType) });
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email address is already in use.' });
        return;
      }

      const rawPassword = password || crypto.randomBytes(8).toString('base64url');
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const maxUser = await User.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxUser?.legacyId || 0) + 1;

      const newAssessor = new User({
        legacyId: nextLegacyId,
        fullName,
        email: email.toLowerCase().trim(),
        phoneNumber,
        userType: Number(userType),
        passwordHash,
        legacyMd5Hash: '',
        status: UserStatus.ACTIVE,
      });

      await newAssessor.save();
      const roleName = userType == UserType.QSA ? 'QSA' : userType == UserType.QA ? 'QA' : 'Consultant';
      await mailService.sendAccountWelcomeMail(newAssessor.email, newAssessor.fullName, rawPassword, roleName);

      res.status(201).json({ success: true, message: `${roleName} created successfully.`, assessor: newAssessor });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getAssessorAssignmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Assessor not found.' });
        return;
      }

      const assignedCompliance = await ComplianceProject.find({
        $or: [
          { qsaId: user._id },
          { qaId: user._id },
          { consultantId: user._id },
          ...(user.legacyId
            ? [
                { legacyQsaId: user.legacyId },
                { legacyQaId: user.legacyId },
                { legacyConsultantId: user.legacyId },
              ]
            : []),
        ],
      })
        .populate('customerId', 'fullName companyName')
        .populate('processId', 'processName');

      const assignedTesting = await TestingProject.find({
        $or: [
          { qsaId: user._id },
          { qaId: user._id },
          { consultantId: user._id },
          ...(user.legacyId
            ? [
                { legacyQsaId: user.legacyId },
                { legacyQaId: user.legacyId },
                { legacyConsultantId: user.legacyId },
              ]
            : []),
        ],
      })
        .populate('customerId', 'fullName companyName')
        .populate('processId', 'processName');

      const projects: { id: string; type: string; client: string; process: string }[] = [];

      assignedCompliance.forEach((p: any) => {
        projects.push({
          id: p._id.toString(),
          type: 'Compliance Project',
          client: p.customerId?.companyName || p.customerId?.fullName || 'Client',
          process: p.processId?.processName || 'General',
        });
      });

      assignedTesting.forEach((p: any) => {
        projects.push({
          id: p._id.toString(),
          type: 'Testing Project',
          client: p.customerId?.companyName || p.customerId?.fullName || 'Client',
          process: p.processId?.processName || 'General',
        });
      });

      res.status(200).json({
        success: true,
        isAssigned: projects.length > 0,
        projects,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async deleteAssessor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Assessor not found.' });
        return;
      }

      // Check if assessor is assigned to any ComplianceProject
      const assignedCompliance = await ComplianceProject.find({
        $or: [
          { qsaId: user._id },
          { qaId: user._id },
          { consultantId: user._id },
          ...(user.legacyId
            ? [
                { legacyQsaId: user.legacyId },
                { legacyQaId: user.legacyId },
                { legacyConsultantId: user.legacyId },
              ]
            : []),
        ],
      })
        .populate('customerId', 'fullName companyName')
        .populate('processId', 'processName')
        .limit(5);

      // Check if assessor is assigned to any TestingProject
      const assignedTesting = await TestingProject.find({
        $or: [
          { qsaId: user._id },
          { qaId: user._id },
          { consultantId: user._id },
          ...(user.legacyId
            ? [
                { legacyQsaId: user.legacyId },
                { legacyQaId: user.legacyId },
                { legacyConsultantId: user.legacyId },
              ]
            : []),
        ],
      })
        .populate('customerId', 'fullName companyName')
        .populate('processId', 'processName')
        .limit(5);

      if (assignedCompliance.length > 0 || assignedTesting.length > 0) {
        const projectNames: string[] = [];
        assignedCompliance.forEach((p: any) => {
          const comp = p.customerId?.companyName || p.customerId?.fullName || 'Client';
          const proc = p.processId?.processName ? ` (${p.processId.processName})` : '';
          projectNames.push(`Compliance [${comp}${proc}]`);
        });
        assignedTesting.forEach((p: any) => {
          const comp = p.customerId?.companyName || p.customerId?.fullName || 'Client';
          const proc = p.processId?.processName ? ` (${p.processId.processName})` : '';
          projectNames.push(`Testing [${comp}${proc}]`);
        });

        res.status(400).json({
          success: false,
          message: `Cannot delete ${user.fullName}. This assessor is currently assigned to project(s): ${projectNames.slice(0, 3).join(', ')}${projectNames.length > 3 ? '...' : ''}. Please reassign the projects before deleting.`,
        });
        return;
      }

      user.status = UserStatus.DELETE;
      await user.save();
      res.status(200).json({ success: true, message: `${user.fullName} deleted successfully.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Frameworks & Project Assignments ---
  public async getComplianceServices(req: Request, res: Response): Promise<void> {
    try {
      const services = await ComplianceService.find().sort({ serviceName: 1 });
      res.status(200).json({ success: true, services });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getTestingServices(req: Request, res: Response): Promise<void> {
    try {
      const testings = await TestingService.find().sort({ testingName: 1 });
      res.status(200).json({ success: true, testings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getComplianceProjects(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.query;
      const filter: any = {};
      if (serviceId) filter.serviceId = Number(serviceId);

      const projects = await ComplianceProject.find(filter)
        .populate('customerId', 'fullName companyName email')
        .populate('processId', 'processName')
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, projects });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async createComplianceProject(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId, customerId, processId, qsaId, qaId, consultantId, startDate, endDate } = req.body;

      const existing = await ComplianceProject.findOne({ serviceId, customerId, processId });
      if (existing) {
        res.status(400).json({ success: false, message: 'This compliance project mapping already exists.' });
        return;
      }

      const maxCp = await ComplianceProject.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxCp?.legacyId || 0) + 1;

      const newProject = new ComplianceProject({
        legacyId: nextLegacyId,
        serviceId: Number(serviceId),
        customerId,
        processId,
        qsaId,
        qaId,
        consultantId,
        startDate: startDate || '',
        endDate: endDate || '',
        status: 0,
      });

      await newProject.save();

      // Trigger Project Assignment emails asynchronously
      (async () => {
        try {
          const [customer, processObj, serviceObj, qsaUser, qaUser, consultantUser] = await Promise.all([
            User.findById(customerId),
            CustomerProcess.findById(processId),
            ComplianceService.findOne({ legacyId: Number(serviceId) }),
            qsaId ? User.findById(qsaId) : null,
            qaId ? User.findById(qaId) : null,
            consultantId ? User.findById(consultantId) : null,
          ]);

          const clientName = customer?.companyName || customer?.fullName || 'Customer';
          const processName = processObj?.processName || 'General Process';
          const serviceName = serviceObj?.serviceName || `Compliance Service #${serviceId}`;

          if (qsaUser?.email) {
            await mailService.sendProjectAssignmentMail(
              qsaUser.email,
              qsaUser.fullName,
              serviceName,
              processName,
              clientName,
              'Qualified Security Assessor (QSA)',
              startDate,
              endDate
            );
          }
          if (qaUser?.email) {
            await mailService.sendProjectAssignmentMail(
              qaUser.email,
              qaUser.fullName,
              serviceName,
              processName,
              clientName,
              'Quality Assurance (QA) Reviewer',
              startDate,
              endDate
            );
          }
          if (consultantUser?.email) {
            await mailService.sendProjectAssignmentMail(
              consultantUser.email,
              consultantUser.fullName,
              serviceName,
              processName,
              clientName,
              'Security Consultant',
              startDate,
              endDate
            );
          }
          if (customer?.email) {
            await mailService.sendProjectAssignmentMail(
              customer.email,
              customer.fullName,
              serviceName,
              processName,
              clientName,
              'Audited Client Organization',
              startDate,
              endDate
            );
          }
        } catch (mailErr) {
          console.error('Failed to send compliance project assignment emails:', mailErr);
        }
      })();

      res.status(201).json({ success: true, message: 'Compliance project assigned successfully.', project: newProject });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async getTestingProjects(req: Request, res: Response): Promise<void> {
    try {
      const { testingId } = req.query;
      const filter: any = {};
      if (testingId) filter.testingId = Number(testingId);

      const projects = await TestingProject.find(filter)
        .populate('customerId', 'fullName companyName email')
        .populate('processId', 'processName')
        .populate('qsaId', 'fullName email')
        .populate('qaId', 'fullName email')
        .populate('consultantId', 'fullName email')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, projects });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async createTestingProject(req: Request, res: Response): Promise<void> {
    try {
      const { testingId, customerId, processId, qsaId, qaId, consultantId, startDate, endDate } = req.body;

      const existing = await TestingProject.findOne({ testingId, customerId, processId });
      if (existing) {
        res.status(400).json({ success: false, message: 'This testing project mapping already exists.' });
        return;
      }

      const maxTp = await TestingProject.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxTp?.legacyId || 0) + 1;

      const newProject = new TestingProject({
        legacyId: nextLegacyId,
        testingId: Number(testingId),
        customerId,
        processId,
        qsaId,
        qaId,
        consultantId,
        startDate: startDate || '',
        endDate: endDate || '',
        status: 0,
      });

      await newProject.save();

      // Trigger Project Assignment emails asynchronously
      (async () => {
        try {
          const [customer, processObj, testingObj, qsaUser, qaUser, consultantUser] = await Promise.all([
            User.findById(customerId),
            CustomerProcess.findById(processId),
            TestingService.findOne({ legacyId: Number(testingId) }),
            qsaId ? User.findById(qsaId) : null,
            qaId ? User.findById(qaId) : null,
            consultantId ? User.findById(consultantId) : null,
          ]);

          const clientName = customer?.companyName || customer?.fullName || 'Customer';
          const processName = processObj?.processName || 'General Process';
          const testingName = testingObj?.testingName || `Testing Service #${testingId}`;

          if (qsaUser?.email) {
            await mailService.sendProjectAssignmentMail(
              qsaUser.email,
              qsaUser.fullName,
              testingName,
              processName,
              clientName,
              'Assessor / Tester',
              startDate,
              endDate
            );
          }
          if (qaUser?.email) {
            await mailService.sendProjectAssignmentMail(
              qaUser.email,
              qaUser.fullName,
              testingName,
              processName,
              clientName,
              'QA Reviewer',
              startDate,
              endDate
            );
          }
          if (consultantUser?.email) {
            await mailService.sendProjectAssignmentMail(
              consultantUser.email,
              consultantUser.fullName,
              testingName,
              processName,
              clientName,
              'Security Consultant',
              startDate,
              endDate
            );
          }
          if (customer?.email) {
            await mailService.sendProjectAssignmentMail(
              customer.email,
              customer.fullName,
              testingName,
              processName,
              clientName,
              'Audited Client Organization',
              startDate,
              endDate
            );
          }
        } catch (mailErr) {
          console.error('Failed to send testing project assignment emails:', mailErr);
        }
      })();

      res.status(201).json({ success: true, message: 'Testing project assigned successfully.', project: newProject });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Questionnaire Management ---
  public async getQuestionnaires(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.query;
      const filter: any = {};
      if (serviceId) filter.serviceId = Number(serviceId);

      const questionnaires = await Questionnaire.find(filter).sort({ legacyId: 1 });
      res.status(200).json({ success: true, questionnaires });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async bulkUpdateQuestionnaireStatus(req: Request, res: Response): Promise<void> {
    try {
      const { ids, status } = req.body; // ids: string[] or legacyId numbers, status: '1'|'2'
      await Questionnaire.updateMany({ _id: { $in: ids } }, { status });
      res.status(200).json({ success: true, message: 'Questionnaire statuses updated.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async createQuestionnaire(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId, question, status = '1' } = req.body;
      if (!serviceId || !question || !question.trim()) {
        res.status(400).json({ success: false, message: 'Compliance Framework and Question text are required.' });
        return;
      }

      const maxQ = await Questionnaire.findOne().sort({ legacyId: -1 });
      const nextLegacyId = (maxQ?.legacyId || 0) + 1;

      const newQuestion = new Questionnaire({
        legacyId: nextLegacyId,
        serviceId: Number(serviceId),
        question: question.trim(),
        status: status === '2' ? '2' : '1',
      });

      await newQuestion.save();
      res.status(201).json({
        success: true,
        message: 'New control question added successfully.',
        questionnaire: newQuestion,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async updateQuestionText(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { question } = req.body;
      await Questionnaire.findByIdAndUpdate(id, { question });
      res.status(200).json({ success: true, message: 'Question text updated.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  // --- Detailed Compliance Project Workspace ---
  public async getComplianceProjectDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const project = await ComplianceProject.findById(id)
        .populate('customerId', 'fullName companyName email phoneNumber address')
        .populate('processId', 'processName')
        .populate('qsaId', 'fullName email phoneNumber')
        .populate('qaId', 'fullName email phoneNumber')
        .populate('consultantId', 'fullName email phoneNumber');

      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }

      const service = await ComplianceService.findOne({ legacyId: project.serviceId });
      const questionnaires = await Questionnaire.find({ serviceId: project.serviceId, status: { $ne: '2' } }).sort({ legacyId: 1 });

      const customerId = (project.customerId as any)?._id || project.customerId;
      const processId = (project.processId as any)?._id || project.processId;

      const [reviews, evidenceDocs, comments, reports] = await Promise.all([
        EvidenceReview.find({ serviceId: project.serviceId, customerId, processId }),
        EvidenceDocument.find({ serviceId: project.serviceId, customerId, processId }),
        AuditComment.find({ serviceId: project.serviceId, customerId, processId })
          .populate('loginUserId', 'fullName email userType')
          .sort({ createdAt: 1 }),
        ComplianceReport.find({ serviceId: project.serviceId, customerId, processId }).sort({ createdAt: -1 }),
      ]);

      res.status(200).json({
        success: true,
        project,
        service,
        questionnaires,
        reviews,
        evidenceDocs,
        comments,
        reports,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async bulkUpdateComplianceReviewStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { questionIds, status } = req.body; // status: 1=Approved, 2=Disapproved, 4=Mark Incomplete
      const project = await ComplianceProject.findById(id);

      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }

      const numericStatus = Number(status);
      let allStatus = 0;
      if (numericStatus === 1) allStatus = 4; // Approved
      else if (numericStatus === 2) allStatus = 5; // Disapproved
      else if (numericStatus === 4) allStatus = 6; // Marked Incomplete

      const customerId = (project.customerId as any)?._id || project.customerId;
      const processId = (project.processId as any)?._id || project.processId;

      if (questionIds && questionIds.length > 0) {
        const now = new Date();
        const operations = questionIds.map((qId: any) => ({
          updateOne: {
            filter: {
              serviceId: project.serviceId,
              customerId,
              processId,
              questionnaireId: qId,
            },
            update: {
              $set: {
                serviceId: project.serviceId,
                customerId,
                processId,
                questionnaireId: qId,
                adminStatus: numericStatus,
                adminStatusDate: now,
                allStatus,
                allStatusDate: now,
              },
            },
            upsert: true,
          },
        }));
        await EvidenceReview.bulkWrite(operations);
      }

      res.status(200).json({ success: true, message: 'Audit review statuses updated successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async handleQaModification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { questionnaireId, action } = req.body; // action: 1 = Accept, 2 = Reject
      const project = await ComplianceProject.findById(id);
      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }

      const customerId = (project.customerId as any)?._id || project.customerId;
      const processId = (project.processId as any)?._id || project.processId;

      await EvidenceReview.findOneAndUpdate(
        { serviceId: project.serviceId, customerId, processId, questionnaireId },
        {
          adminQa: Number(action),
          adminQaDate: new Date(),
          qaModification: Number(action) === 1 ? 0 : 1,
        }
      );

      res.status(200).json({
        success: true,
        message: `QA modification request ${Number(action) === 1 ? 'accepted' : 'rejected'}.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async handleCustomerModification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { questionnaireId, action } = req.body; // action: 1 = Accept, 2 = Reject
      const project = await ComplianceProject.findById(id);
      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }

      const customerId = (project.customerId as any)?._id || project.customerId;
      const processId = (project.processId as any)?._id || project.processId;

      await EvidenceReview.findOneAndUpdate(
        { serviceId: project.serviceId, customerId, processId, questionnaireId },
        {
          adminCustomer: Number(action),
          adminCustomerDate: new Date().toISOString(),
          cusModification: Number(action) === 1 ? 0 : 1,
        }
      );

      res.status(200).json({
        success: true,
        message: `Customer modification request ${Number(action) === 1 ? 'accepted' : 'rejected'}.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async setProjectEndDate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { endDate } = req.body;
      const project = await ComplianceProject.findByIdAndUpdate(
        id,
        { endDate },
        { new: true }
      );
      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }
      res.status(200).json({ success: true, message: 'Project End Date recorded successfully.', project });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async updateProjectStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body; // 0 = In Progress, 1 = Completed
      const project = await ComplianceProject.findByIdAndUpdate(
        id,
        { status: Number(status) },
        { new: true }
      );
      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }
      res.status(200).json({
        success: true,
        message: `Project status updated to ${Number(status) === 1 ? 'Completed' : 'In Progress'}.`,
        project,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async uploadComplianceReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reportOf } = req.body; // 'ROC' | 'AOC'
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: 'Please upload a valid PDF report document.' });
        return;
      }

      const project = await ComplianceProject.findById(id);
      if (!project) {
        res.status(404).json({ success: false, message: 'Compliance project not found.' });
        return;
      }

      const customerId = (project.customerId as any)?._id || project.customerId;
      const processId = (project.processId as any)?._id || project.processId;
      const type = (reportOf || 'ROC').toUpperCase() as 'ROC' | 'AOC';

      // Delete existing report of same type if any
      const existing = await ComplianceReport.findOne({
        serviceId: project.serviceId,
        customerId,
        processId,
        reportOf: type,
      });

      if (existing) {
        await storageService.deleteFile('report', existing.reportDocs);
        await ComplianceReport.findByIdAndDelete(existing._id);
      }

      const fileObj = file as any;
      const report = new ComplianceReport({
        serviceId: project.serviceId,
        customerId,
        processId,
        userId: req.user?._id,
        reportDocs: file.filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        reportOf: type,
        date: new Date().toISOString().split('T')[0],
        year: new Date().getFullYear(),
        storageType: fileObj.storageType || (storageService.isS3Enabled() ? 's3' : 'local'),
        s3Url: fileObj.s3Url || '',
        s3Key: fileObj.s3Key || '',
        s3Bucket: fileObj.s3Bucket || '',
        folder: 'report',
      });

      await report.save();

      // Dispatch notification to Customer that report is available
      (async () => {
        try {
          const [customer, serviceObj, processObj] = await Promise.all([
            User.findById(customerId),
            ComplianceService.findOne({ legacyId: project.serviceId }),
            CustomerProcess.findById(processId),
          ]);
          if (customer?.email) {
            await mailService.sendComplianceReportUploadedMail(
              customer.email,
              customer.companyName || customer.fullName,
              type,
              processObj?.processName || 'General Process',
              serviceObj?.serviceName || 'Compliance Standard',
              report.year
            );
          }
        } catch (mailErr) {
          console.error('Failed to send compliance report uploaded email:', mailErr);
        }
      })();

      res.status(201).json({ success: true, message: `${type} uploaded successfully.`, report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }

  public async deleteComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await ComplianceReport.findById(reportId);
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found.' });
        return;
      }

      await storageService.deleteFile('report', report.reportDocs);

      await ComplianceReport.findByIdAndDelete(reportId);
      res.status(200).json({ success: true, message: 'Report removed successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: formatErrorMessage(error) });
    }
  }
}

export const adminController = new AdminController();
