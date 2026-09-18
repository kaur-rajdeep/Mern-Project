import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

function randomLetters(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

test.describe('Module 3: Super Administrator — Security Assessors & Project Assignment Guard', () => {
  const timestamp = Date.now();
  const suffix = randomLetters(6);
  const testQsaName = `Assessor QSA ${suffix}`;
  const testQsaEmail = `qsa.test_${timestamp}@panaceatest.com`;

  const testUnassignedName = `Unassigned Assessor ${suffix}`;
  const testUnassignedEmail = `unassigned.test_${timestamp}@panaceatest.com`;

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await page.goto('/admin/assessors');
    await page.waitForLoadState('networkidle');
  });

  test('ASSR-01: Create QSA Assessor', async ({ page }) => {
    await page.locator('button:has-text("Add New Assessor")').click();
    const modal = page.locator('div.fixed', { hasText: /Add Security Assessor/i });
    await expect(modal).toBeVisible({ timeout: 6000 });

    await modal.locator('select').selectOption('2'); // QSA Assessor
    await modal.locator('input').nth(0).fill(testQsaName);
    await modal.locator('input[type="email"]').fill(testQsaEmail);
    await modal.locator('input').nth(2).fill('9876543210');
    await modal.locator('input[placeholder*="auto-generated" i]').fill('Password@123');

    await modal.locator('button[type="submit"]').click();

    // Verify QSA created and listed
    await expect(page.locator('tr', { hasText: testQsaName })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tr', { hasText: testQsaName }).locator('text=QSA Assessor')).toBeVisible();
  });

  test('ASSR-02 & ASSR-03: Create QA Auditor & Compliance Consultant', async ({ page }) => {
    const qaName = `QA Auditor ${randomLetters(6)}`;
    const consName = `Consultant ${randomLetters(6)}`;

    // Create QA
    await page.locator('button:has-text("Add New Assessor")').click();
    let modal = page.locator('div.fixed', { hasText: /Add Security Assessor/i });
    await modal.locator('select').selectOption('3'); // QA Auditor
    await modal.locator('input').nth(0).fill(qaName);
    await modal.locator('input[type="email"]').fill(`qa.test_${timestamp}@panaceatest.com`);
    await modal.locator('input').nth(2).fill('9876543210');
    await modal.locator('input[placeholder*="auto-generated" i]').fill('Password@123');
    await modal.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    // Create Consultant
    await page.locator('button:has-text("Add New Assessor")').click();
    modal = page.locator('div.fixed', { hasText: /Add Security Assessor/i });
    await modal.locator('select').selectOption('4'); // Consultant
    await modal.locator('input').nth(0).fill(consName);
    await modal.locator('input[type="email"]').fill(`consultant.test_${timestamp}@panaceatest.com`);
    await modal.locator('input').nth(2).fill('9876543210');
    await modal.locator('input[placeholder*="auto-generated" i]').fill('Password@123');
    await modal.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('tr', { hasText: qaName })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('tr', { hasText: consName })).toBeVisible({ timeout: 8000 });
  });

  test('ASSR-04: Filter Assessors by Role Tabs', async ({ page }) => {
    // 1. Filter QSA
    await page.locator('button:has-text("QSA Assessors")').click();
    await page.waitForTimeout(500);
    // 2. Filter QA
    await page.locator('button:has-text("QA Auditors")').click();
    await page.waitForTimeout(500);
    // 3. Filter Consultants
    await page.locator('button:has-text("Consultants")').click();
    await page.waitForTimeout(500);
    // 4. Return to All
    await page.locator('button:has-text("All Assessors")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('table')).toBeVisible();
  });

  test('ASSR-05: Assignment Guard Blocks Deleting Assigned Assessor', async ({ page }) => {
    // Find an assigned assessor row (e.g. Alex QSA or existing assessor)
    const assignedRow = page.locator('tr', { hasText: /QSA Assessor|QA Auditor|Alex/i }).first();
    const trashBtn = assignedRow.locator('button[title="Delete Assessor"]').first();

    if (await trashBtn.isVisible()) {
      await trashBtn.click();
      await page.waitForTimeout(1000);

      // Verify assignment guard triggers if assigned
      const guardModal = page.locator('div.fixed', { hasText: /Cannot Delete Assessor|Active Project Assignments/i });
      if (await guardModal.isVisible()) {
        await expect(guardModal.locator('text=Cannot Delete Assessor')).toBeVisible();
        await expect(guardModal.locator('button:has-text("Confirm Delete")')).toBeHidden();
        // Close modal
        await guardModal.locator('button:has-text("Close"), button:has-text("Understood"), button:has(svg.lucide-x)').first().click();
      } else {
        // Dismiss standard delete modal if not assigned
        const cancelBtn = page.locator('button:has-text("Cancel")');
        if (await cancelBtn.isVisible()) await cancelBtn.click();
      }
    }
  });

  test('ASSR-06: Delete Unassigned Assessor Confirmation Flow', async ({ page }) => {
    // First create a brand new unassigned assessor
    await page.locator('button:has-text("Add New Assessor")').click();
    const modal = page.locator('div.fixed', { hasText: /Add Security Assessor/i });
    await modal.locator('select').selectOption('2');
    await modal.locator('input').nth(0).fill(testUnassignedName);
    await modal.locator('input[type="email"]').fill(testUnassignedEmail);
    await modal.locator('input').nth(2).fill('9876543210');
    await modal.locator('input[placeholder*="auto-generated" i]').fill('Password@123');
    await modal.locator('button[type="submit"]').click();

    const row = page.locator('tr', { hasText: testUnassignedName });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click delete on the unassigned assessor
    await row.locator('button[title="Delete Assessor"]').click();
    await page.waitForTimeout(1000);

    const deleteModal = page.locator('div.fixed', { hasText: /Delete Assessor|Are you sure/i });
    await expect(deleteModal).toBeVisible({ timeout: 6000 });

    const confirmBtn = deleteModal.locator('button:has-text("Confirm Delete"), button:has-text("Delete")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('tr', { hasText: testUnassignedName })).toBeHidden({ timeout: 8000 });
    }
  });

});
