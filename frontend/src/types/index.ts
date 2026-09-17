export enum UserType {
  ADMIN = 1,
  QSA = 2,
  QA = 3,
  CONSULTANT = 4,
  CUSTOMER = 5,
}

export interface User {
  id: string;
  legacyId?: number;
  parentId?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  companyName?: string;
  companyNumber?: string;
  address?: string;
  status: 'active' | 'inactive' | 'delete';
  userType: UserType;
  permissions?: string;
}

export interface CustomerProcess {
  _id: string;
  legacyId?: number;
  customerId: string;
  processName: string;
  status: number;
  createdAt: string;
}

export interface ComplianceProject {
  _id: string;
  legacyId?: number;
  serviceId: number;
  serviceName?: string;
  customerId: { _id: string; fullName: string; companyName: string; email: string };
  processId: { _id: string; processName: string };
  qsaId: { _id: string; fullName: string; email: string };
  qaId: { _id: string; fullName: string; email: string };
  consultantId: { _id: string; fullName: string; email: string };
  startDate?: string;
  endDate?: string;
  status: number;
}

export interface TestingProject {
  _id: string;
  legacyId?: number;
  testingId: number;
  testingName?: string;
  customerId: { _id: string; fullName: string; companyName: string; email: string };
  processId: { _id: string; processName: string };
  qsaId: { _id: string; fullName: string; email: string };
  qaId: { _id: string; fullName: string; email: string };
  consultantId: { _id: string; fullName: string; email: string };
  startDate?: string;
  endDate?: string;
  status: number;
}

export interface Questionnaire {
  _id: string;
  legacyId?: number;
  serviceId: number;
  question: string;
  status: '1' | '2';
}

export interface EvidenceReview {
  _id: string;
  legacyId?: number;
  questionnaireId: string;
  processId: string;
  serviceId: number;
  customerId: string;
  questCheckedVal: string;
  status: number; // QSA: 1=Appr, 2=Disappr, 4=Incomp
  qaStatus: number; // QA: 1=Appr, 2=Disappr, 4=Incomp
  consultantStatus: number;
  adminStatus: number;
  allStatus: number;
  cusModification: number;
  qsaModification: number;
  qaModification: number;
  statusDate?: string;
  qaStatusDate?: string;
}

export interface EvidenceDocument {
  _id: string;
  legacyId?: number;
  docs: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

export interface AssessorDocument {
  _id: string;
  legacyId?: number;
  docs: string;
  originalFilename?: string;
  userId: { _id: string; fullName: string; userType: number };
  createdAt: string;
}

export interface AuditComment {
  _id: string;
  legacyId?: number;
  questionId?: string;
  questionnaireId?: string;
  comments: string;
  loginUserId: { _id: string; fullName: string; userType: number; email: string };
  loginUserDate: string;
  createdAt: string;
}

export interface AuditItem {
  question: Questionnaire;
  review: EvidenceReview | null;
  customerDocs: EvidenceDocument[];
  assessorDocs: AssessorDocument[];
  comments: AuditComment[];
}

export interface ComplianceReport {
  _id: string;
  serviceId: number;
  reportDocs: string;
  reportOf: 'AOC' | 'ROC' | 'AOT' | 'ROT';
  date: string;
  year: number;
  processId?: { processName: string };
  userId?: { fullName: string };
}
