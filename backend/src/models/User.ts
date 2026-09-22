import mongoose, { Schema, Document } from 'mongoose';
import { UserType, UserStatus } from '../constants/roles';

export interface IUser extends Document {
  legacyId?: number;
  parentId?: mongoose.Types.ObjectId | null;
  legacyParentId?: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string; // bcrypt hash
  legacyMd5Hash?: string; // MD5 from MySQL for seamless initial login
  companyName?: string;
  companyNumber?: string;
  address?: string;
  status: UserStatus;
  userType: UserType;
  certificateKey?: string;
  newCertificateKey?: string;
  isCertificateVerified: number;
  uniqueId?: string;
  permissions?: string;
  tokenVersion?: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    legacyId: { type: Number, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    legacyParentId: { type: Number, default: 0 },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phoneNumber: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    legacyMd5Hash: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    userType: {
      type: Number,
      enum: [UserType.ADMIN, UserType.QSA, UserType.QA, UserType.CONSULTANT, UserType.CUSTOMER],
      required: true,
      index: true,
    },
    certificateKey: { type: String, default: '' },
    newCertificateKey: { type: String, default: '' },
    isCertificateVerified: { type: Number, default: 0 },
    uniqueId: { type: String, default: '' },
    permissions: { type: String, default: '' },
    tokenVersion: { type: Number, default: 0 },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
