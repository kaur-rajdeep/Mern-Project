const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupTestUsers() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/panaceainfosec';
  await mongoose.connect(MONGODB_URI);

  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('guru@1234', 10);

  const testUsers = [
    {
      email: 'panacea@yopmail.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      userType: 1, // Admin
      status: 'active',
      companyName: 'Panacea Infosec',
    },
    {
      email: 'customer@panaceatest.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Acme Security POC',
      userType: 5, // Customer
      status: 'active',
      companyName: 'Acme Corporation',
    },
    {
      email: 'qsa@panaceatest.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Alex QSA Assessor',
      userType: 2, // QSA
      status: 'active',
      companyName: 'Panacea QSA Team',
    },
    {
      email: 'qa@panaceatest.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Rachel QA Auditor',
      userType: 3, // QA
      status: 'active',
      companyName: 'Panacea QA Team',
    },
    {
      email: 'consultant@panaceatest.com',
      passwordHash: defaultPasswordHash,
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
