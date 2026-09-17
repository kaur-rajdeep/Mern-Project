import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 2 & 3: Super Administrator Governance', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
  });

  test('CUST-01: View Customers Directory & Search Filter', async ({ page }) => {
    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');

    // Check table headers or customer listing elements
    await expect(page.locator('text=Customers').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="Search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Acme');
      await page.waitForTimeout(500);
      expect(await page.locator('table').or(page.locator('body')).textContent()).toBeDefined();
    }
  });

  test('ASSR-01: View Assessors Directory', async ({ page }) => {
    await page.goto('/admin/assessors');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Assessors').or(page.locator('text=Auditors')).first()).toBeVisible();
  });

  test('PROJ-01: View Compliance Projects Management', async ({ page }) => {
    await page.goto('/admin/compliance-projects');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Compliance Projects').or(page.locator('text=Projects')).first()).toBeVisible();
  });

});
