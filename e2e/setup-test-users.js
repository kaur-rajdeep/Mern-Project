const path = require('path');
const dotenv = require('dotenv');

// Load base .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const testEnv = (process.env.TEST_ENV || 'local').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, `../.env.${testEnv}`), override: true });

const isDev = testEnv === 'dev' || testEnv === 'development';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupTestUsers() {
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    (isDev ? process.env.DEV_MONGODB_URI : process.env.LOCAL_MONGODB_URI) ||
    'mongodb://127.0.0.1:27017/panaceainfosec';

  if (!MONGODB_URI) {
    console.log(`[setup-test-users] Notice: No MONGODB_URI configured for environment: "${testEnv}". Skipping user seeding.`);
    return;
  }

  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  const defaultPassword = process.env.DEFAULT_TEST_PASSWORD || 'Password@123';
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);

  const adminEmail =
    process.env.ADMIN_EMAIL ||
    (isDev ? process.env.DEV_ADMIN_EMAIL : process.env.LOCAL_ADMIN_EMAIL) ||
    'panacea@yopmail.com';
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    (isDev ? process.env.DEV_ADMIN_PASSWORD : process.env.LOCAL_ADMIN_PASSWORD) ||
    'guru@1234';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const customerEmail =
    process.env.CUSTOMER_EMAIL ||
    (isDev ? process.env.DEV_CUSTOMER_EMAIL : process.env.LOCAL_CUSTOMER_EMAIL) ||
    'customer@panaceatest.com';
  const customerPassword =
    process.env.CUSTOMER_PASSWORD ||
    (isDev ? process.env.DEV_CUSTOMER_PASSWORD : process.env.LOCAL_CUSTOMER_PASSWORD) ||
    defaultPassword;
  const customerPasswordHash = await bcrypt.hash(customerPassword, 10);

  const qsaEmail =
    process.env.QSA_EMAIL ||
    (isDev ? process.env.DEV_QSA_EMAIL : process.env.LOCAL_QSA_EMAIL) ||
    'qsa@panaceatest.com';
  const qsaPassword =
    process.env.QSA_PASSWORD ||
    (isDev ? process.env.DEV_QSA_PASSWORD : process.env.LOCAL_QSA_PASSWORD) ||
    defaultPassword;
  const qsaPasswordHash = await bcrypt.hash(qsaPassword, 10);

  const qaEmail =
    process.env.QA_EMAIL ||
    (isDev ? process.env.DEV_QA_EMAIL : process.env.LOCAL_QA_EMAIL) ||
    'qa@panaceatest.com';
  const qaPassword =
    process.env.QA_PASSWORD ||
    (isDev ? process.env.DEV_QA_PASSWORD : process.env.LOCAL_QA_PASSWORD) ||
    defaultPassword;
  const qaPasswordHash = await bcrypt.hash(qaPassword, 10);

  const consultantEmail =
    process.env.CONSULTANT_EMAIL ||
    (isDev ? process.env.DEV_CONSULTANT_EMAIL : process.env.LOCAL_CONSULTANT_EMAIL) ||
    'consultant@panaceatest.com';
  const consultantPassword =
    process.env.CONSULTANT_PASSWORD ||
    (isDev ? process.env.DEV_CONSULTANT_PASSWORD : process.env.LOCAL_CONSULTANT_PASSWORD) ||
    defaultPassword;
  const consultantPasswordHash = await bcrypt.hash(consultantPassword, 10);

  const testUsers = [
    {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      userType: 1, // Admin
      status: 'active',
      companyName: 'Panacea Infosec',
    },
    {
      email: customerEmail,
      passwordHash: customerPasswordHash,
      fullName: 'Acme Security POC',
      userType: 5, // Customer
      status: 'active',
      companyName: 'Acme Corporation',
    },
    {
      email: qsaEmail,
      passwordHash: qsaPasswordHash,
      fullName: 'Alex QSA Assessor',
      userType: 2, // QSA
      status: 'active',
      companyName: 'Panacea QSA Team',
    },
    {
      email: qaEmail,
      passwordHash: qaPasswordHash,
      fullName: 'Rachel QA Auditor',
      userType: 3, // QA
      status: 'active',
      companyName: 'Panacea QA Team',
    },
    {
      email: consultantEmail,
      passwordHash: consultantPasswordHash,
      fullName: 'Sam Consultant',
      userType: 4, // Consultant
      status: 'active',
      companyName: 'Panacea Advisory Team',
    },
  ];

  for (const u of testUsers) {
    await mongoose.connection.collection('users').updateOne(
      { email: u.email },
      {
        $set: {
          fullName: u.fullName,
          passwordHash: u.passwordHash,
          userType: u.userType,
          status: u.status,
          companyName: u.companyName,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          phoneNumber: '9999999999',
          isCertificateVerified: 1,
        },
      },
      { upsert: true }
    );
  }

  console.log('✔ Test users initialized successfully.');
  await mongoose.disconnect();
}

setupTestUsers().catch((err) => {
  console.error('Failed to setup test users:', err);
  process.exit(1);
});
