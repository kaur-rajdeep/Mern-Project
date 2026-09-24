import mongoose, { Schema, Document } from 'mongoose';

export interface ITestingProject extends Document {
  legacyId?: number;
  testingId: number;
  customerId: mongoose.Types.ObjectId;
  legacyCustomerId?: number;
  processId: mongoose.Types.ObjectId;
  legacyProcessId?: number;
  qsaId?: mongoose.Types.ObjectId | null;
  legacyQsaId?: number;
  consultantId?: mongoose.Types.ObjectId | null;
  legacyConsultantId?: number;
  qaId?: mongoose.Types.ObjectId | null;
  legacyQaId?: number;
  startDate: string;
  endDate: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestingProjectSchema = new Schema<ITestingProject>(
  {
    legacyId: { type: Number, index: true },
    testingId: { type: Number, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    legacyCustomerId: { type: Number },
    processId: { type: Schema.Types.ObjectId, ref: 'CustomerProcess', required: true, index: true },
    legacyProcessId: { type: Number },
    qsaId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    legacyQsaId: { type: Number },
    consultantId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    legacyConsultantId: { type: Number },
    qaId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    legacyQaId: { type: Number },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    status: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

TestingProjectSchema.index({ testingId: 1, customerId: 1, processId: 1 }, { unique: true });

export const TestingProject = mongoose.model<ITestingProject>('TestingProject', TestingProjectSchema);
