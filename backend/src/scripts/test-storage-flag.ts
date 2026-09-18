import dotenv from 'dotenv';
dotenv.config();

import { storageService } from '../services/storageService';
import fs from 'fs';
import path from 'path';

async function testStorageFlow() {
  console.log('--- STARTING HYBRID STORAGE VERIFICATION ---');

  // Test 1: Default Mode (Local)
  console.log(`Current process.env.s3_flag: ${process.env.s3_flag}`);
  console.log(`storageService.isS3Enabled(): ${storageService.isS3Enabled()}`);

  if (storageService.isS3Enabled()) {
    console.log('S3 Mode is Active.');
    console.log(`Bucket: ${storageService.getBucketName()}`);
    console.log(`Region: ${storageService.getRegion()}`);
  } else {
    console.log('Local Mode is Active.');
    console.log(`Uploads Directory: ${storageService.getUploadsRoot()}`);

    // Create dummy test file in uploads/evidence
    const testFilename = storageService.generateUniqueFilename('test_evidence.pdf');
    const localEvidenceDir = path.join(storageService.getUploadsRoot(), 'evidence');
    if (!fs.existsSync(localEvidenceDir)) {
      fs.mkdirSync(localEvidenceDir, { recursive: true });
    }
    const testFilePath = path.join(localEvidenceDir, testFilename);
    fs.writeFileSync(testFilePath, 'Panacea Infosec Test Evidence Content');

    // Verify fileExists
    const exists = await storageService.fileExists('evidence', testFilename);
    console.log(`fileExists('evidence', '${testFilename}'): ${exists}`);
    if (!exists) throw new Error('Local fileExists check failed');

    // Verify getFileStream
    const fileData = await storageService.getFileStream('evidence', testFilename);
    console.log(`getFileStream returned stream: ${!!fileData.stream}, size: ${fileData.size}`);
    if (!fileData.stream) throw new Error('Local getFileStream failed');

    // Read to completion so file handle is closed
    await new Promise((resolve, reject) => {
      fileData.stream.on('data', () => {});
      fileData.stream.on('end', resolve);
      fileData.stream.on('error', reject);
    });

    // Verify deleteFile
    const deleted = await storageService.deleteFile('evidence', testFilename);
    console.log(`deleteFile('evidence', '${testFilename}'): ${deleted}`);
    const stillExists = await storageService.fileExists('evidence', testFilename);
    console.log(`fileExists after delete: ${stillExists}`);
    if (stillExists) throw new Error('Local file delete failed');
  }

  // Test 2: Simulated S3 URL & Key Generation
  const dummyS3Filename = storageService.generateUniqueFilename('sample_policy.docx');
  const bucket = storageService.getBucketName();
  const region = storageService.getRegion();
  const s3Key = `evidence/${dummyS3Filename}`;
  const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  console.log('\nSimulated S3 Metadata:');
  console.log(`- Folder: evidence`);
  console.log(`- Filename: ${dummyS3Filename}`);
  console.log(`- S3 Key: ${s3Key}`);
  console.log(`- S3 URL: ${s3Url}`);

  console.log('\n--- HYBRID STORAGE VERIFICATION COMPLETED SUCCESSFULLY ---');
}

testStorageFlow().catch((err) => {
  console.error('Storage test failed:', err);
  process.exit(1);
});
