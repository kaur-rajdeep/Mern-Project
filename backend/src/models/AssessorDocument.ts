import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessorDocument extends Document {
  legacyId?: number;
  questionnaireId: mongoose.Types.ObjectId;
  legacyQuestionnaireId?: number;
  serviceId: number;
  processId: mongoose.Types.ObjectId;
  legacyProcessId?: number;
  parentId?: mongoose.Types.ObjectId;
  legacyParentId?: number;
  customerId: mongoose.Types.ObjectId;
  legacyCustomerId?: number;
  userId: mongoose.Types.ObjectId; // Assessor (QSA, QA, Consultant)
  legacyUserId?: number;
  docs: string; // Stored filename
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  sha256Checksum?: string;
  storageType?: 'local' | 's3';
  s3Url?: string;
  s3Key?: string;
  s3Bucket?: string;
  folder?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssessorDocumentSchema = new Schema<IAssessorDocument>(
  {
    legacyId: { type: Number, index: true },
    questionnaireId: { type: Schema.Types.ObjectId, ref: 'Questionnaire', required: true, index: true },
    legacyQuestionnaireId: { type: Number, index: true },
    serviceId: { type: Number, required: true, index: true },
    processId: { type: Schema.Types.ObjectId, ref: 'CustomerProcess', required: true, index: true },
    legacyProcessId: { type: Number, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    legacyParentId: { type: Number, default: 0 },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    legacyCustomerId: { type: Number, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    legacyUserId: { type: Number, index: true },
    docs: { type: String, required: true },
    originalFilename: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    sha256Checksum: { type: String },
    storageType: { type: String, enum: ['local', 's3'], default: 'local' },
    s3Url: { type: String, default: '' },
    s3Key: { type: String, default: '' },
    s3Bucket: { type: String, default: '' },
    folder: { type: String, default: 'qsa' },
  },
  { timestamps: true }
);

export const AssessorDocument = mongoose.model<IAssessorDocument>(
  'AssessorDocument',
  AssessorDocumentSchema
);
