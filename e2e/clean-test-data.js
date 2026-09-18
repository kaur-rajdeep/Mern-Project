const path = require('path');
const dotenv = require('dotenv');

// Load base .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const testEnv = (process.env.TEST_ENV || 'local').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, `../.env.${testEnv}`), override: true });

const isDev = testEnv === 'dev' || testEnv === 'development';

const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (isDev ? process.env.DEV_MONGODB_URI : process.env.LOCAL_MONGODB_URI) ||
  'mongodb://127.0.0.1:27017/panaceainfosec';
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

/**
 * Clean data created by automated E2E tests.
 * @param {Object} [filter] Optional specific customerEmail or identifiers.
 * If no filter is passed, cleans all historical test data matching Apex Global Payments / david.poc_.
 */
async function cleanTestData(filter = {}) {
  if (!MONGODB_URI) {
    console.log(`[cleanTestData] Notice: No MONGODB_URI configured for environment: "${testEnv}". Skipping DB cleanup.`);
    return { cleaned: 0 };
  }

  const shouldDisconnect = !mongoose.connection.readyState;
  if (shouldDisconnect) {
    await mongoose.connect(MONGODB_URI);
  }

  try {
    const db = mongoose.connection.db;

    // 1. Determine target users to clean
    let userQuery = {};
    if (filter.customerEmail) {
      userQuery = { email: filter.customerEmail.toLowerCase().trim() };
    } else {
      userQuery = {
        $or: [
          { email: { $regex: '^david\\.poc_', $options: 'i' } },
          { email: { $regex: '^testcust_', $options: 'i' } },
          { email: { $regex: '^nova\\.poc_', $options: 'i' } },
          { email: { $regex: '^qsa\\.test_', $options: 'i' } },
          { email: { $regex: '^qa\\.test_', $options: 'i' } },
          { email: { $regex: '^consultant\\.test_', $options: 'i' } },
          { email: { $regex: '^unassigned\\.test_', $options: 'i' } },
          { companyName: { $regex: '^Apex Global Payments', $options: 'i' } },
          { companyName: { $regex: '^Nova Compliance Corp', $options: 'i' } },
        ],
      };
    }

    const testUsers = await db.collection('users').find(userQuery).toArray();
    const customerIds = testUsers.map((u) => u._id);

    // Also include any specific customerId passed in filter
    if (filter.customerId && !customerIds.some(id => id.toString() === filter.customerId.toString())) {
      customerIds.push(new mongoose.Types.ObjectId(filter.customerId));
    }

    // 2. Find all associated processes
    const processQuery = {
      $or: [
        { customerId: { $in: customerIds } },
        { processName: { $regex: '^Core Payment Enclave', $options: 'i' } },
        { processName: { $regex: '^Payment Vault Alpha', $options: 'i' } },
      ],
    };
    if (filter.processId) {
      processQuery.$or.push({ _id: new mongoose.Types.ObjectId(filter.processId) });
    }
    const testProcesses = await db.collection('customerprocesses').find(processQuery).toArray();
    const processIds = testProcesses.map((p) => p._id);

    // 3. Find all associated compliance projects
    const projectQuery = {
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    };
    if (filter.projectId) {
      try {
        projectQuery.$or.push({ _id: new mongoose.Types.ObjectId(filter.projectId) });
      } catch (e) {}
    }
    const testProjects = await db.collection('complianceprojects').find(projectQuery).toArray();
    const projectIds = testProjects.map((p) => p._id);

    // 4. Delete uploaded Evidence documents and delete physical files
    const evidenceDocs = await db.collection('evidencedocuments').find({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    }).toArray();

    for (const doc of evidenceDocs) {
      if (doc.docs) {
        const filePath = path.join(UPLOADS_DIR, 'evidence', doc.docs);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn('Could not delete evidence file:', doc.docs);
        }
      }
    }
    const deletedEvidence = await db.collection('evidencedocuments').deleteMany({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    });

    // 5. Delete uploaded Compliance Reports (ROC/AOC) and physical files
    const reportDocs = await db.collection('compliancereports').find({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    }).toArray();

    for (const rep of reportDocs) {
      if (rep.reportDocs) {
        const filePath = path.join(UPLOADS_DIR, 'report', rep.reportDocs);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn('Could not delete report file:', rep.reportDocs);
        }
      }
    }
    const deletedReports = await db.collection('compliancereports').deleteMany({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    });

    // 6. Delete Audit Comments
    const deletedComments = await db.collection('auditcomments').deleteMany({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    });

    // 7. Delete Evidence Reviews
    const deletedReviews = await db.collection('evidencereviews').deleteMany({
      $or: [
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    });

    // 8. Delete Compliance Projects
    const deletedProjects = await db.collection('complianceprojects').deleteMany({
      $or: [
        { _id: { $in: projectIds } },
        { customerId: { $in: customerIds } },
        { processId: { $in: processIds } },
      ],
    });

    // 9. Delete Customer Processes
    const deletedProcesses = await db.collection('customerprocesses').deleteMany({
      $or: [
        { _id: { $in: processIds } },
        { customerId: { $in: customerIds } },
      ],
    });

    // 10. Delete Customer & Assessor Test Users
    const deletedUsers = await db.collection('users').deleteMany({
      _id: { $in: customerIds },
    });

    // 11. Delete Temporary Control Questions
    const deletedQuestions = await db.collection('questions').deleteMany({
      question: { $regex: '^Verify automated encryption of payment cardholder PAN data at rest', $options: 'i' },
    });

    console.log(`[E2E Cleanup] Purged test data:
      Users: ${deletedUsers.deletedCount}
      Processes: ${deletedProcesses.deletedCount}
      Projects: ${deletedProjects.deletedCount}
      Evidence Files: ${deletedEvidence.deletedCount}
      Reports: ${deletedReports.deletedCount}
      Comments: ${deletedComments.deletedCount}
      Reviews: ${deletedReviews.deletedCount}
      Questions: ${deletedQuestions.deletedCount}`);

    return {
      users: deletedUsers.deletedCount,
      processes: deletedProcesses.deletedCount,
      projects: deletedProjects.deletedCount,
      evidence: deletedEvidence.deletedCount,
      reports: deletedReports.deletedCount,
      comments: deletedComments.deletedCount,
      reviews: deletedReviews.deletedCount,
    };
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  cleanTestData()
    .then(() => {
      console.log('Clean completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Clean failed:', err);
      process.exit(1);
    });
}

module.exports = { cleanTestData };
