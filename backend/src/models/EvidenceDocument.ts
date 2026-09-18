import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidenceDocument extends Document {
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
  docs: string; // Stored filename e.g. Network_Diagram-4819.pdf
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

const EvidenceDocumentSchema = new Schema<IEvidenceDocument>(
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
    docs: { type: String, required: true },
    originalFilename: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    sha256Checksum: { type: String },
    storageType: { type: String, enum: ['local', 's3'], default: 'local' },
    s3Url: { type: String, default: '' },
    s3Key: { type: String, default: '' },
    s3Bucket: { type: String, default: '' },
    folder: { type: String, default: 'evidence' },
  },
  { timestamps: true }
);

export const EvidenceDocument = mongoose.model<IEvidenceDocument>(
  'EvidenceDocument',
  EvidenceDocumentSchema
);
