import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 1: Authentication, Authorization & RBAC', () => {

  test('AUTH-01: Super Admin Login & Dashboard Access', async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await expect(page.locator('text=Super Administrator').or(page.locator('text=Administrator')).first()).toBeVisible();
  });

  test('AUTH-02: Customer (Client POC) Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);
    await expect(page.locator('text=Customer Dashboard').or(page.locator('text=Compliance')).first()).toBeVisible();
  });

  test('AUTH-03: QSA Assessor Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.QSA.email, TEST_USERS.QSA.password, TEST_USERS.QSA.expectedPath);
    await expect(page.locator('text=QSA').or(page.locator('text=Assessor')).first()).toBeVisible();
  });

  test('AUTH-04: QA Auditor Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.QA.email, TEST_USERS.QA.password, TEST_USERS.QA.expectedPath);
    await expect(page.locator('text=QA').or(page.locator('text=Auditor')).first()).toBeVisible();
  });

  test('AUTH-05: Consultant Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.CONSULTANT.email, TEST_USERS.CONSULTANT.password, TEST_USERS.CONSULTANT.expectedPath);
    await expect(page.locator('text=Consultant').or(page.locator('text=Advisory')).first()).toBeVisible();
  });

  test('AUTH-06: Invalid Credentials Show Error Message', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('panacea@yopmail.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();

    // Look for error toast or notification
    await expect(
      page.locator('text=Invalid email or password').or(page.locator('text=Login failed')).or(page.locator('[data-sonner-toast]')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-08: RBAC Route Guard Blocks Cross-Role Navigation', async ({ page }) => {
    // Log in as Customer
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);

    // Attempt unauthorized navigation to Admin customer management
    await page.goto('/admin/customers');

    // Should be redirected away from /admin/customers back to customer dashboard or root
    await page.waitForURL((url) => !url.pathname.startsWith('/admin/customers'), { timeout: 7000 });
    expect(page.url()).not.toContain('/admin/customers');
  });

  test('SEC-009: Forgot Password Anti-Enumeration Behavior', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('nonexistent.ghost.account@panaceatest.com');
    await page.locator('button[type="submit"]').click();

    // The UI should show confirmation screen without revealing that the user doesn't exist
    await expect(page.getByRole('heading', { name: /Check Your Email/i })).toBeVisible({ timeout: 6000 });
  });

});
