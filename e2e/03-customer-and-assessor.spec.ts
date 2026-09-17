import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 6, 7 & 8: Workspaces (Customer, QSA, QA, Consultant)', () => {

  test('CUST-WS: Customer Dashboard Loads Processes & Controls', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);
    await page.waitForLoadState('networkidle');

    // Check dashboard elements
    await expect(
      page.locator('h1, h2, h3').filter({ hasText: /Customer Audit Workspace|Workspace|Dashboard|Processes/i }).first()
    ).toBeVisible();
  });

  test('QSA-WS: QSA Dashboard Renders Assessment Projects', async ({ page }) => {
    await loginAs(page, TEST_USERS.QSA.email, TEST_USERS.QSA.password, TEST_USERS.QSA.expectedPath);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2, h3').filter({ hasText: /QSA|Assessment|Dashboard/i }).first()).toBeVisible();
  });

  test('QA-WS: QA Auditor Dashboard Renders Review Controls', async ({ page }) => {
    await loginAs(page, TEST_USERS.QA.email, TEST_USERS.QA.password, TEST_USERS.QA.expectedPath);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2, h3').filter({ hasText: /QA|Review|Audit/i }).first()).toBeVisible();
  });

  test('CONS-WS: Consultant Dashboard Renders Advisory Controls', async ({ page }) => {
    await loginAs(page, TEST_USERS.CONSULTANT.email, TEST_USERS.CONSULTANT.password, TEST_USERS.CONSULTANT.expectedPath);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2, h3').filter({ hasText: /Consultant|Advisory|Dashboard/i }).first()).toBeVisible();
  });

});
