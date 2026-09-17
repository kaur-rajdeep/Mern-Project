import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidenceReview extends Document {
  legacyId?: number;
  questionnaireId: mongoose.Types.ObjectId;
  legacyQuestionnaireId?: number;
  processId: mongoose.Types.ObjectId;
  legacyProcessId?: number;
  serviceId: number; // Framework or Testing ID
  parentId?: mongoose.Types.ObjectId;
  legacyParentId?: number;
  customerId: mongoose.Types.ObjectId;
  legacyCustomerId?: number;

  firstStatus: number;
  questCheckedVal: string; // 'on'
  statusDate?: Date;
  status: number; // QSA: 1=Accept&Assign QA, 2=Disapproved, 3=In Progress, 4=Mark Incomplete
  qsaId?: mongoose.Types.ObjectId;
  legacyQsaId?: number;

  qaStatus: number; // QA: 1=Approved, 2=Disapproved, 3=In Progress, 4=Mark Incomplete
  qaStatusDate?: Date;
  qaId?: mongoose.Types.ObjectId;
  legacyQaId?: number;

  consultantStatus: number;
  consultantStatusDate?: string;
  consultantId?: mongoose.Types.ObjectId;
  legacyConsultantId?: number;

  cusModification: number; // 1=Requested
  cusModificationDate?: Date;
  qsaModification: number;
  qsaDate?: string;
  qaModification: number;
  qaDate?: Date;
  cusaltantModification: number;
  cunsaltantDate?: string;

  adminCustomer: number; // 1=Accepted, 2=Reject
  adminCustomerDate?: string;
  adminQa: number;
  adminQaDate?: Date;
  adminQsa: number;
  adminQsaDate?: string;
  adminCusaltant: number;

  allStatusDate?: Date;
  allStatus: number; // Master status: 0-9
  adminStatus: number; // 1=Approved, 2=Disapproved, 4=Incomplete
  adminStatusDate?: Date;

  customerStatus: number;
  customerDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceReviewSchema = new Schema<IEvidenceReview>(
  {
    legacyId: { type: Number, index: true },
    questionnaireId: { type: Schema.Types.ObjectId, ref: 'Questionnaire', required: true, index: true },
    legacyQuestionnaireId: { type: Number, index: true },
    processId: { type: Schema.Types.ObjectId, ref: 'CustomerProcess', required: true, index: true },
    legacyProcessId: { type: Number, index: true },
    serviceId: { type: Number, required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    legacyParentId: { type: Number, default: 0 },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    legacyCustomerId: { type: Number, index: true },

    firstStatus: { type: Number, default: 0 },
    questCheckedVal: { type: String, default: 'on' },
    statusDate: { type: Date },
    status: { type: Number, default: 0 },
    qsaId: { type: Schema.Types.ObjectId, ref: 'User' },
    legacyQsaId: { type: Number },

    qaStatus: { type: Number, default: 0 },
    qaStatusDate: { type: Date },
    qaId: { type: Schema.Types.ObjectId, ref: 'User' },
    legacyQaId: { type: Number },

    consultantStatus: { type: Number, default: 0 },
    consultantStatusDate: { type: String, default: '' },
    consultantId: { type: Schema.Types.ObjectId, ref: 'User' },
    legacyConsultantId: { type: Number },

    cusModification: { type: Number, default: 0 },
    cusModificationDate: { type: Date },
    qsaModification: { type: Number, default: 0 },
    qsaDate: { type: String, default: '' },
    qaModification: { type: Number, default: 0 },
    qaDate: { type: Date },
    cusaltantModification: { type: Number, default: 0 },
    cunsaltantDate: { type: String, default: '' },

    adminCustomer: { type: Number, default: 0 },
    adminCustomerDate: { type: String, default: '' },
    adminQa: { type: Number, default: 0 },
    adminQaDate: { type: Date },
    adminQsa: { type: Number, default: 0 },
    adminQsaDate: { type: String, default: '' },
    adminCusaltant: { type: Number, default: 0 },

    allStatusDate: { type: Date },
    allStatus: { type: Number, default: 0, index: true },
    adminStatus: { type: Number, default: 0 },
    adminStatusDate: { type: Date },

    customerStatus: { type: Number, default: 0 },
    customerDate: { type: String, default: '' },
  },
  { timestamps: true }
);

EvidenceReviewSchema.index(
  { serviceId: 1, processId: 1, questionnaireId: 1, customerId: 1 },
  { unique: true }
);

export const EvidenceReview = mongoose.model<IEvidenceReview>('EvidenceReview', EvidenceReviewSchema);
