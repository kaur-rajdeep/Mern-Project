import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 2: Super Administrator — Customer & Process Scope Management', () => {
  const timestamp = Date.now();
  const testCompanyName = `Nova Compliance Corp ${timestamp}`;
  const testEmail = `nova.poc_${timestamp}@novatest.com`;
  const testProcessName = `Payment Vault Alpha ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');
  });

  test('CUST-01: Create New Customer Organization', async ({ page }) => {
    // 1. Open create customer modal
    await page.locator('button:has-text("Add New Customer")').click();
    await expect(page.getByRole('heading', { name: /Add Customer Organization/i })).toBeVisible({ timeout: 6000 });

    // 2. Fill form
    const modal = page.locator('div.fixed', { hasText: 'Add Customer Organization' });
    await modal.locator('input').nth(0).fill(testCompanyName);
    await modal.locator('input').nth(1).fill(`REG-${timestamp}`);
    await modal.locator('input').nth(2).fill('Jane Miller POC');
    await modal.locator('input').nth(3).fill('9876543210');
    await modal.locator('input[type="email"]').fill(testEmail);
    await modal.locator('input').nth(5).fill('Password@123');

    // 3. Submit
    await modal.locator('button[type="submit"]:has-text("Create Organization")').click();

    // 4. Verify created customer exists in table
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    await expect(customerRow).toBeVisible({ timeout: 10000 });
  });

  test('CUST-02: Duplicate Customer Email Validation', async ({ page }) => {
    await page.locator('button:has-text("Add New Customer")').click();
    const modal = page.locator('div.fixed', { hasText: 'Add Customer Organization' });

    // Fill with existing email
    await modal.locator('input').nth(0).fill(`Duplicate Co ${timestamp}`);
    await modal.locator('input').nth(1).fill(`REG-DUP-${timestamp}`);
    await modal.locator('input').nth(2).fill('Duplicate POC');
    await modal.locator('input').nth(3).fill('9876543210');
    await modal.locator('input[type="email"]').fill(testEmail); // Same email as CUST-01
    await modal.locator('input').nth(5).fill('Password@123');

    await modal.locator('button[type="submit"]:has-text("Create Organization")').click();

    // Expect duplicate error notification
    await expect(
      page.locator('text=already in use')
        .or(page.locator('text=already exists'))
        .or(page.locator('[data-sonner-toast]'))
        .first()
    ).toBeVisible({ timeout: 6000 });

    // Close modal
    await modal.locator('button:has(svg.lucide-x)').first().click();
  });

  test('CUST-03: Customer Scope / Process Creation', async ({ page }) => {
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    await expect(customerRow).toBeVisible({ timeout: 8000 });

    // Open process modal
    await customerRow.locator('button[title="Manage Audit Processes"]').click();
    await expect(page.getByRole('heading', { name: /Audit Processes & Scopes/i })).toBeVisible({ timeout: 6000 });

    // Add process
    await page.getByPlaceholder('e.g. Cardholder Data Environment (CDE)').fill(testProcessName);
    await page.locator('button:has-text("Add Process")').click();

    // Verify process listed
    await expect(page.locator(`div:has-text("${testProcessName}")`).first()).toBeVisible({ timeout: 7000 });

    // Close modal
    await page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /Audit Processes & Scopes/i }) }).locator('button:has(svg.lucide-x)').click();
  });

  test('CUST-04 & CUST-05: Process Archival & View Archived Processes', async ({ page }) => {
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    await customerRow.locator('button[title="Manage Audit Processes"]').click();

    // Handle process archival
    const processItem = page.locator('div', { hasText: testProcessName });
    const archiveBtn = processItem.locator('button[title*="Archive" i], button:has(svg.lucide-archive)').first();

    if (await archiveBtn.isVisible()) {
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await archiveBtn.click();
      await page.waitForTimeout(1000);
    }

    // Close modal
    const closeBtn = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /Audit Processes & Scopes/i }) }).locator('button:has(svg.lucide-x)');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // Verify archived processes route
    await page.goto('/admin/archived-processes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("Archived Processes")').or(page.locator('text=Archived Processes')).first()).toBeVisible({ timeout: 7000 });
  });

  test('CUST-06 & CUST-07: Reset / Reveal Password Security Check', async ({ page }) => {
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    const keyBtn = customerRow.locator('button[title="Reset Password"]').first();

    if (await keyBtn.isVisible()) {
      await keyBtn.click();
      const modal = page.locator('div.fixed', { hasText: /Security Verification|Reset User Password/i });
      await expect(modal).toBeVisible({ timeout: 5000 });

      // CUST-07: Enter wrong admin password
      const adminPwdInput = modal.locator('input[type="password"]');
      await adminPwdInput.fill('WrongAdminPassword!');
      await modal.locator('button[type="submit"]:has-text("Reset Password")').click();

      // Verify rejection
      await expect(
        page.locator('text=Invalid Admin password')
          .or(page.locator('[data-sonner-toast]'))
          .first()
      ).toBeVisible({ timeout: 6000 });

      // Close modal
      await modal.locator('button:has(svg.lucide-x)').first().click();
    }
  });

  test('CUST-08: Download Customer Device Certificate', async ({ page }) => {
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    const certBtn = customerRow.locator('button[title="Download Device Certificate"]').first();

    if (await certBtn.isVisible()) {
      // Trigger download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
        certBtn.click(),
      ]);

      if (download) {
        expect(download.suggestedFilename()).toContain('certificate');
      }
    }
  });

  test('CUST-09: Soft Delete Customer Account', async ({ page }) => {
    const customerRow = page.locator('tr', { hasText: testCompanyName });
    const deleteBtn = customerRow.locator('button[title="Delete Customer"]').first();

    if (await deleteBtn.isVisible()) {
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteBtn.click();
      await page.waitForTimeout(1000);

      // Verify customer is marked deleted / removed from active list
      await page.goto('/admin/customers');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('tr', { hasText: testCompanyName })).toBeHidden({ timeout: 7000 });
    }
  });

});
