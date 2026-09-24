import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs, API_BASE } from './fixtures/auth.helper';

test.describe('Module 1: Authentication, Authorization & RBAC', () => {

  test('AUTH-01: Super Admin Login & Dashboard Access', async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await expect(page.locator('text=Super Administrator').or(page.locator('text=Administrator')).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-02: Customer (Client POC) Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);
    await expect(page.locator('text=Customer Dashboard').or(page.locator('text=Compliance')).or(page.locator('text=Workspace')).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-03: QSA Assessor Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.QSA.email, TEST_USERS.QSA.password, TEST_USERS.QSA.expectedPath);
    await expect(page.locator('text=QSA').or(page.locator('text=Assessor')).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-04: QA Auditor Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.QA.email, TEST_USERS.QA.password, TEST_USERS.QA.expectedPath);
    await expect(page.locator('text=QA').or(page.locator('text=Auditor')).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-05: Consultant Login', async ({ page }) => {
    await loginAs(page, TEST_USERS.CONSULTANT.email, TEST_USERS.CONSULTANT.password, TEST_USERS.CONSULTANT.expectedPath);
    await expect(page.locator('text=Consultant').or(page.locator('text=Advisory')).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-06: Invalid Credentials Denied with Error Message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(TEST_USERS.ADMIN.email);
    await page.locator('input[type="password"]').fill('CompletelyWrongPassword!123');
    await page.locator('button[type="submit"]').click();

    // Verify error toast or banner
    await expect(
      page.locator('text=Invalid email or password')
        .or(page.locator('text=Login failed'))
        .or(page.locator('[data-sonner-toast]'))
        .first()
    ).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-07: Deactivated / Non-existent User Login Rejection', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('deactivated.user.probe@endtest-mail.io');
    await page.locator('input[type="password"]').fill('Password@123');
    await page.locator('button[type="submit"]').click();

    await expect(
      page.locator('text=Invalid email or password')
        .or(page.locator('text=deactivated'))
        .or(page.locator('[data-sonner-toast]'))
        .first()
    ).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-08: RBAC Route Guard Blocks Cross-Role Navigation', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);

    // Attempt unauthorized navigation to Admin customer directory
    await page.goto('/admin/customers');

    // Route guard must kick user out of /admin/customers
    await page.waitForURL((url) => !url.pathname.startsWith('/admin/customers'), { timeout: 8000 });
    expect(page.url()).not.toContain('/admin/customers');
  });

  test('AUTH-09: Token Expiration / Missing Session Redirects to Login', async ({ page }) => {
    // Navigate with cleared session
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Attempt accessing protected admin URL directly without token
    await page.goto('/admin/dashboard');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 8000 });
    expect(page.url()).toContain('/login');
  });

  test('AUTH-10: Forgot Password Anti-Enumeration Screen', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('random.unknown.account@endtest-mail.io');
    await page.locator('button[type="submit"]').click();

    // UI displays confirmation screen without leaking account existence
    await expect(page.getByRole('heading', { name: /Check Your Email/i })).toBeVisible({ timeout: 7000 });
  });

});
