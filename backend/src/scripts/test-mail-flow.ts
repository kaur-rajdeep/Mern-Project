import dotenv from 'dotenv';
dotenv.config();

import { mailService } from '../services/mailService';

async function verifyEmailService() {
  console.log('--- STARTING EMAIL WORKFLOW VERIFICATION ---');

  // 1. Test Project Assignment
  const res1 = await mailService.sendProjectAssignmentMail(
    ['qsa@endtest-mail.io', 'qa@endtest-mail.io'],
    'Auditors Team',
    'PCI DSS Compliance v4.0',
    'Core Payment Processing',
    'Acme Corp',
    'QSA & QA Reviewers',
    '2026-09-01',
    '2026-10-31'
  );
  console.log('1. Project Assignment Mail sent:', res1);

  // 2. Test Evidence Submission
  const res2 = await mailService.sendEvidenceSubmissionMail(
    'qsa@endtest-mail.io',
    'John Assessor',
    'Acme Corp',
    'Core Payment Processing',
    'PCI DSS',
    'Requirement #1.2 - Firewall Configuration Standards',
    3
  );
  console.log('2. Evidence Submission Mail sent:', res2);

  // 3. Test Common Review Status Mail on QA Disapproval (Single common email to Customer, QSA, Consultant)
  const recipients = ['customer@endtest-mail.io', 'qsa@endtest-mail.io', 'consultant@endtest-mail.io'];
  const recipientNames = 'Acme Corp, John Assessor (QSA), Sarah Consultant (Consultant)';
  const res3 = await mailService.sendReviewStatusMail(
    recipients,
    recipientNames,
    'Core Payment Processing',
    'PCI DSS',
    'Requirement #3.4 - Encryption Key Storage',
    'Disapproved by QA',
    'Quality Assurance (QA) Reviewer',
    'David QA',
    'Evidence document does not show annual cryptographic key rotation logs.'
  );
  console.log('3. QA Disapproval Common Mail sent:', res3);

  // 4. Test Audit Comment Mail
  const res4 = await mailService.sendAuditCommentMail(
    'customer@endtest-mail.io',
    'Acme Corp',
    'John Assessor',
    'QSA Auditor',
    'Core Payment Processing',
    'PCI DSS',
    'Requirement #8.2 - Multi-Factor Authentication',
    'Please clarify if MFA is enforced for all administrative access or only external connections.'
  );
  console.log('4. Audit Comment Mail sent:', res4);

  // 5. Test Compliance Report Upload Mail
  const res5 = await mailService.sendComplianceReportUploadedMail(
    'customer@endtest-mail.io',
    'Acme Corp',
    'ROC',
    'Core Payment Processing',
    'PCI DSS',
    2026
  );
  console.log('5. Compliance Report Upload Mail sent:', res5);

  // 6. Test Security Alert Mail for Bulk Export
  const res6 = await mailService.sendSecurityAlertMail(
    'security@endtest-mail.io',
    'Full Compliance Evidence Package Exported',
    {
      requesterName: 'John Assessor',
      requesterEmail: 'qsa@endtest-mail.io',
      requesterRole: 'QSA',
      targetCustomer: 'Acme Corp',
      processName: 'Core Payment Processing',
      ipAddress: '192.168.1.100',
      fileCount: 42,
    }
  );
  console.log('6. Security Alert Mail sent:', res6);

  console.log('--- ALL EMAIL WORKFLOW CHECKS COMPLETED SUCCESSFULLY ---');
}

verifyEmailService().catch((err) => {
  console.error('Email verification error:', err);
  process.exit(1);
});
