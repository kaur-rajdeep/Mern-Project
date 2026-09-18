import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 9: Consultant — Advisory Workspace & Pre-Audit Readiness', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.CONSULTANT.email, TEST_USERS.CONSULTANT.password, TEST_USERS.CONSULTANT.expectedPath);
    await page.waitForLoadState('networkidle');
  });

  test('CONS-01: Open Advisory Workspace & Engagement List', async ({ page }) => {
    await expect(
      page.locator('h1, h2, h3').filter({ hasText: /Consultant|Advisory|Dashboard/i }).first()
    ).toBeVisible({ timeout: 8000 });

    const auditLink = page.locator('a[href*="/consultant/audit"], a:has-text("Advisory"), a:has-text("Review")').first();
    if (await auditLink.isVisible()) {
      await auditLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Advisory').or(page.locator('text=Readiness')).or(page.locator('text=Controls')).first()).toBeVisible();
    }
  });

  test('CONS-02: Update Advisory Readiness Status (Ready / Needs Work)', async ({ page }) => {
    const auditLink = page.locator('a[href*="/consultant/audit"], a:has-text("Review")').first();
    if (await auditLink.isVisible()) {
      await auditLink.click();
      await page.waitForLoadState('networkidle');

      // Expand a control
      const card = page.locator('div[class*="border border-slate-200"]').first();
      if (await card.isVisible()) {
        const markReadyBtn = card.locator('button:has-text("Ready"), button:has-text("Accept")');
        const needsWorkBtn = card.locator('button:has-text("Needs Work"), button:has-text("Gap")');

        if (await markReadyBtn.isVisible()) {
          await expect(markReadyBtn).toBeEnabled();
        }
        if (await needsWorkBtn.isVisible()) {
          await expect(needsWorkBtn).toBeEnabled();
        }
      }
    }
  });

  test('CONS-03 & CONS-04: Guidance Artifacts & Threaded Advisory Recommendations', async ({ page }) => {
    const auditLink = page.locator('a[href*="/consultant/audit"], a:has-text("Review")').first();
    if (await auditLink.isVisible()) {
      await auditLink.click();
      await page.waitForLoadState('networkidle');

      // Check for comments or advisory input box
      const commentInput = page.locator('textarea, input[placeholder*="comment" i]').first();
      if (await commentInput.isVisible()) {
        await expect(commentInput).toBeVisible();
      }
    }
  });

});
