import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { ComplianceService } from '../models/ComplianceService';
import { Questionnaire } from '../models/Questionnaire';
import { UserType, UserStatus } from '../constants/roles';

// Load environment variables
dotenv.config();

const DATA_DIR = path.join(__dirname, '../../Panaceainfosec DB Data');

// Helper to parse MongoDB Extended JSON ($oid and $date)
const ejsonReviver = (key: string, value: any) => {
  if (value && typeof value === 'object') {
    if (value.$oid) {
      return new mongoose.Types.ObjectId(value.$oid);
    }
    if (value.$date) {
      return new Date(value.$date);
    }
  }
  return value;
};

const loadJson = (filename: string) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File ${filename} not found in ${DATA_DIR}`);
    return [];
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent, ejsonReviver);
};

async function seedFresh() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/panaceainfosec';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');

    // Note: We don't delete existing data here since this is intended 
    // as a first-time run script. If run twice, duplicate key errors will 
    // safely prevent double-seeding.

    // 1. Insert Base Admin User
    console.log('Inserting base Admin user...');
    const adminUser = new User({
      email: "panacea@yopmail.com",
      // BCrypt hash for "guru@1234"
      passwordHash: "$2a$10$NKN0WW1kkLE1vKW7opYH7.JZjfh8S1ZREJYOiq3rp4FjUUDx6Xktu",
      fullName: "System Administrator",
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: "5435345345",
      companyName: "Panacea Infosec",
      address: "",
      permissions: "",
      isCertificateVerified: 1,
      legacyParentId: 0,
      legacyMd5Hash: ""
    });
    await adminUser.save();
    console.log(`Admin user created: ${adminUser.email}`);

    // 3. Load and Insert Roles
    console.log('Loading Roles...');
    const rolesData = loadJson('panaceainfosec.roles.json');
    if (rolesData.length > 0) {
      await Role.insertMany(rolesData);
      console.log(`Inserted ${rolesData.length} roles.`);
    }

    // 4. Load and Insert Compliance Services
    console.log('Loading Compliance Services...');
    const servicesData = loadJson('panaceainfosec.complianceservices.json');
    if (servicesData.length > 0) {
      await ComplianceService.insertMany(servicesData);
      console.log(`Inserted ${servicesData.length} compliance services.`);
    }

    // 5. Load and Insert Questionnaires
    console.log('Loading Questionnaires (this may take a moment)...');
    const questionnairesData = loadJson('panaceainfosec.questionnaires.json');
    if (questionnairesData.length > 0) {
      await Questionnaire.insertMany(questionnairesData);
      console.log(`Inserted ${questionnairesData.length} questionnaires.`);
    }

    console.log('\n=============================================');
    console.log('✅ Fresh installation seeding completed successfully.');
    console.log('=============================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during seeding process:', error);
    process.exit(1);
  }
}

seedFresh();
