import { test, expect } from './fixtures/test.fixture';
import path from 'path';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';
const { cleanTestData } = require('./clean-test-data');

test.describe.serial('Module 12: Full Compliance Audit Lifecycle (Golden Path)', () => {
  const timestamp = Date.now();
  const companyName = `Apex Global Payments ${timestamp}`;
  const pocName = 'David Miller POC';
  const customerEmail = `david.poc_${timestamp}@apexpayments.com`;
  const customerPassword = process.env.DEFAULT_TEST_PASSWORD || 'Password@123';
  const processName = `Core Payment Enclave ${timestamp}`;
  const samplePdfPath = path.resolve(__dirname, 'fixtures/sample_evidence.pdf');

  let projectId = '';

  test('Step 1: Admin Creates Customer Organization and Audit Process Scope', async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);

    // 1. Navigate to Customer Management
    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');

    // 2. Open Add Customer Modal
    await page.locator('button:has-text("Add New Customer")').click();
    await expect(page.getByRole('heading', { name: 'Add Customer Organization' })).toBeVisible();

    // 3. Fill Customer Form
    const customerForm = page.locator('form', { hasText: 'Company / Organization Name' });
    await customerForm.locator('input').nth(0).fill(companyName);
    await customerForm.locator('input').nth(1).fill(`REG-${timestamp}`);
    await customerForm.locator('input').nth(2).fill(pocName);
    await customerForm.locator('input').nth(3).fill('9876543210');
    await customerForm.locator('input[type="email"]').fill(customerEmail);
    await customerForm.locator('input').nth(5).fill(customerPassword);

    await customerForm.locator('button[type="submit"]:has-text("Create Organization")').click();

    // Wait for customer row in table
    const customerRow = page.locator('tr', { hasText: companyName });
    await expect(customerRow).toBeVisible({ timeout: 10000 });

    // 4. Open Audit Process / Scope Modal
    await customerRow.locator('button[title="Manage Audit Processes"]').click();

    // 5. Add Process Scope
    await expect(page.getByRole('heading', { name: 'Audit Processes & Scopes' })).toBeVisible();
    await page.getByPlaceholder('e.g. Cardholder Data Environment (CDE)').fill(processName);
    await page.locator('button:has-text("Add Process")').click();

    // Verify Process appears in list
    await expect(page.locator(`div:has-text("${processName}")`).first()).toBeVisible({ timeout: 7000 });

    // Close Modal
    await page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: 'Audit Processes & Scopes' }) }).locator('button:has(svg.lucide-x)').click();
  });

  test('Step 2: Admin Creates Compliance Project & Assigns Multi-Role Team', async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);

    // Navigate to Compliance Projects
    await page.goto('/admin/compliances');
    await page.waitForLoadState('networkidle');

    // Open Assign Project Modal
    await page.locator('button:has-text("Assign New Project")').click();

    const modal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: 'Assign Compliance Project' }) });
    await expect(modal).toBeVisible();

    // Select Customer
    await modal.locator('select').nth(1).selectOption({ label: companyName });

    // Wait for process select to enable and select process
    const processSelect = modal.locator('select').nth(2);
    await expect(processSelect).toBeEnabled({ timeout: 7000 });
    await processSelect.selectOption({ label: processName });

    // Select QSA Assessor (Alex QSA Assessor)
    await modal.locator('select').nth(3).selectOption({ label: 'Alex QSA Assessor' });

    // Select QA Auditor (Rachel QA Auditor)
    await modal.locator('select').nth(4).selectOption({ label: 'Rachel QA Auditor' });

    // Select Consultant (Sam Consultant)
    await modal.locator('select').nth(5).selectOption({ label: 'Sam Consultant' });

    // Dates
    await modal.locator('input[type="date"]').nth(0).fill('2026-01-01');
    await modal.locator('input[type="date"]').nth(1).fill('2026-12-31');

    // Submit
    await modal.locator('button[type="submit"]:has-text("Create Project")').click();

    // Verify project appears in listing
    const projectRow = page.locator('tr', { hasText: companyName });
    await expect(projectRow).toBeVisible({ timeout: 10000 });

    // Click Audit View to navigate & extract Project ID
    await projectRow.locator('button:has-text("Audit View")').click();
    await page.waitForURL('**/admin/compliances/**', { timeout: 10000 });

    const urlParts = page.url().split('/');
    projectId = urlParts[urlParts.length - 1].split('?')[0];
    expect(projectId).toBeTruthy();
  });

  test('Step 3: Customer Logs In, Uploads Evidence & Posts Discussion Comment', async ({ page }) => {
    // 1. Log in with newly created customer credentials
    await loginAs(page, customerEmail, customerPassword, '/customer/dashboard');

    // 2. Locate Process Scope Card
    const processCard = page.locator(`a:has-text("${processName}")`);
    await expect(processCard).toBeVisible({ timeout: 8000 });
    await processCard.click();

    // 3. Process Details Page -> Click Upload & review evidence
    await page.waitForLoadState('networkidle');
    const uploadLink = page.locator('a:has-text("Upload & review evidence")');
    await expect(uploadLink).toBeVisible({ timeout: 7000 });

    await uploadLink.click();
    await page.waitForURL('**/customer/evidence-audit**', { timeout: 8000 });

    // 4. In Evidence Audit View, upload sample PDF evidence document into first expanded control
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    await fileInput.setInputFiles(samplePdfPath);

    // Enter submission note
    const noteInput = page.locator('input[placeholder*="submission note"]').first();
    if (await noteInput.isVisible()) {
      await noteInput.fill('Security compliance policy documentation v1.0');
    }

    // Submit Evidence
    await page.locator('button:has-text("Submit Evidence")').first().click();

    // Verify evidence file appears
    await expect(page.locator('text=sample_evidence.pdf').first()).toBeVisible({ timeout: 10000 });

    // 5. Post a threaded discussion comment
    const commentInput = page.locator('input[placeholder*="Add an audit discussion note"]').first();
    await commentInput.fill('Evidence uploaded for assessor review.');
    await page.locator('button:has-text("Reply")').first().click();

    // Verify comment appears in thread
    await expect(page.locator('text=Evidence uploaded for assessor review.').first()).toBeVisible({ timeout: 6000 });
  });

  test('Step 4: QSA Assessor Reviews Evidence, Adds Reply & Routes to QA', async ({ page }) => {
    await loginAs(page, TEST_USERS.QSA.email, TEST_USERS.QSA.password, TEST_USERS.QSA.expectedPath);

    // Enter project via QSA Dashboard card
    await page.goto('/qsa/dashboard');
    await page.waitForLoadState('networkidle');

    const projectCard = page.locator('div[class*="bg-white p-5 rounded-2xl"]', { hasText: companyName });
    await expect(projectCard).toBeVisible({ timeout: 8000 });
    await projectCard.locator('a:has-text("Conduct QSA Audit")').click();
    await page.waitForURL('**/qsa/audit-view**', { timeout: 8000 });

    // Verify customer's uploaded file is visible in first control
    await expect(page.locator('text=sample_evidence.pdf').first()).toBeVisible({ timeout: 10000 });

    // QSA posts comment reply
    const commentInput = page.locator('input[placeholder*="Add an audit discussion note"]').first();
    if (await commentInput.isVisible()) {
      await commentInput.fill('QSA: Evidence inspected and verified against control requirement.');
      await page.locator('button:has-text("Reply")').first().click();
      await page.waitForTimeout(500);
    }

    // Accept & Assign to QA
    const acceptBtn = page.locator('button:has-text("Accept & Assign to QA")').first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Step 5: QA Auditor Verifies Controls, Checks Filter Tabs & Approves', async ({ page }) => {
    await loginAs(page, TEST_USERS.QA.email, TEST_USERS.QA.password, TEST_USERS.QA.expectedPath);

    await page.goto('/qa/dashboard');
    await page.waitForLoadState('networkidle');

    // Enter project QA review via QA Dashboard card
    const projectCard = page.locator('div[class*="bg-white p-5 rounded-2xl"]', { hasText: companyName });
    await expect(projectCard).toBeVisible({ timeout: 8000 });
    await projectCard.locator('a:has-text("Execute QA Review")').click();
    await page.waitForURL('**/qa/audit-view**', { timeout: 8000 });

    // Test filter tabs
    const allTab = page.locator('button:has-text("All")').first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(300);
    }

    // Expand first control if not expanded yet
    if (!(await page.locator('button:has-text("QA Approve")').first().isVisible())) {
      const firstHeader = page.locator('div[class*="p-4 sm:p-5 flex items-start justify-between"]').first();
      await firstHeader.click();
    }

    // Approve control as QA
    const qaApproveBtn = page.locator('button:has-text("QA Approve")').first();
    await expect(qaApproveBtn).toBeVisible({ timeout: 8000 });
    await qaApproveBtn.click();
    await page.waitForTimeout(1000);
  });

  test('Step 6: Super Admin Uploads ROC, Completes Milestone & Uploads AOC', async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);

    // Open project workspace directly using saved projectId
    await page.goto(`/admin/compliances/${projectId}`);
    await page.waitForLoadState('networkidle');

    // 1. Upload ROC (Report on Compliance) via header Upload ROC button
    await page.getByRole('button', { name: 'Upload ROC', exact: true }).click();
    const rocModal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: 'Upload Report on Compliance (ROC)' }) });
    await expect(rocModal).toBeVisible({ timeout: 5000 });

    await rocModal.locator('input[type="file"][accept="application/pdf"]').setInputFiles(samplePdfPath);

    const [rocResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/reports') && res.status() === 201),
      rocModal.locator('button:has-text("Confirm & Upload ROC")').click(),
    ]);
    expect(rocResponse.ok()).toBeTruthy();
    await expect(rocModal).toBeHidden({ timeout: 5000 });

    // 2. Upload AOC (Attestation of Compliance) via header Upload AOC button
    await page.getByRole('button', { name: 'Upload AOC', exact: true }).click();
    const aocModal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: 'Upload Attestation of Compliance (AOC)' }) });
    await expect(aocModal).toBeVisible({ timeout: 5000 });

    await aocModal.locator('input[type="file"][accept="application/pdf"]').setInputFiles(samplePdfPath);

    const [aocResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/reports') && res.status() === 201),
      aocModal.locator('button:has-text("Confirm & Upload AOC")').click(),
    ]);
    expect(aocResponse.ok()).toBeTruthy();
    await expect(aocModal).toBeHidden({ timeout: 5000 });

    // 3. Mark Project Status as Completed under Milestone tab in sidebar
    const milestoneTabBtn = page.locator('button:has-text("Milestone")');
    await milestoneTabBtn.click();

    const markCompletedBtn = page.locator('button:has-text("Mark Completed")');
    await expect(markCompletedBtn).toBeVisible({ timeout: 5000 });
    if (await markCompletedBtn.isEnabled()) {
      await markCompletedBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Completed').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Step 7: Customer Downloads Official AOC & ROC Deliverables', async ({ page }) => {
    await loginAs(page, customerEmail, customerPassword, '/customer/dashboard');

    // Navigate to Attestation Reports
    await page.goto('/customer/reports');
    await page.waitForLoadState('networkidle');

    // Verify Attestations Page loaded
    await expect(page.locator('h2:has-text("Compliance Attestations")')).toBeVisible();

    // Verify reports or deliverable cards exist
    const reportCards = page.locator('div[class*="bg-white p-5 rounded-2xl"]');
    await expect(reportCards.first()).toBeVisible({ timeout: 10000 });

    // Verify Download links are present
    const downloadBtns = page.locator('a:has-text("Download")');
    await expect(downloadBtns.first()).toBeVisible({ timeout: 5000 });
  });

  test.afterAll(async () => {
    // Automatically purge all test database entries and uploaded files created during this test run
    await cleanTestData({ customerEmail });
  });
});
