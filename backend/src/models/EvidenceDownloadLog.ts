import mongoose, { Schema, Document } from 'mongoose';
import { UserType } from '../constants/roles';

export interface IEvidenceDownloadLog extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: UserType;
  processId: mongoose.Types.ObjectId;
  processTitle?: string;
  serviceId: number;
  serviceName?: string;
  customerId: mongoose.Types.ObjectId;
  customerName?: string;
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED_AUTH' | 'FAILED_FORBIDDEN' | 'FAILED_ERROR';
  failureReason?: string;
  fileCount?: number;
  archiveSizeBytes?: number;
  downloadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceDownloadLogSchema = new Schema<IEvidenceDownloadLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: Number, required: true, index: true },
    processId: { type: Schema.Types.ObjectId, ref: 'CustomerProcess', required: true, index: true },
    processTitle: { type: String },
    serviceId: { type: Number, required: true, index: true },
    serviceName: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String },
    ipAddress: { type: String, default: 'unknown' },
    userAgent: { type: String, default: '' },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED_AUTH', 'FAILED_FORBIDDEN', 'FAILED_ERROR'],
      required: true,
      index: true,
    },
    failureReason: { type: String },
    fileCount: { type: Number, default: 0 },
    archiveSizeBytes: { type: Number, default: 0 },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const EvidenceDownloadLog = mongoose.model<IEvidenceDownloadLog>(
  'EvidenceDownloadLog',
  EvidenceDownloadLogSchema
);
