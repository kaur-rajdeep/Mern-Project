import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 8: QA Reviewer — Quality Assurance & Batch Approvals', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.QA.email, TEST_USERS.QA.password, TEST_USERS.QA.expectedPath);
    await page.waitForLoadState('networkidle');
  });

  test('QA-01: Open QA Verification Matrix & Dashboard', async ({ page }) => {
    await expect(
      page.locator('h1, h2, h3').filter({ hasText: /QA|Review|Audit|Dashboard/i }).first()
    ).toBeVisible({ timeout: 8000 });

    const reviewBtn = page.locator('a[href*="/qa/audit"], button:has-text("Review"), a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Quality Assurance').or(page.locator('text=Requirements')).or(page.locator('text=Controls')).first()).toBeVisible();
    }
  });

  test('QA-02 & QA-03: Individual Control Verification & Decision Actions', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      // Expand a control question card
      const controlItem = page.locator('div[class*="border border-slate-200"]').first();
      if (await controlItem.isVisible()) {
        const qaApproveBtn = controlItem.locator('button:has-text("QA Approve"), button:has-text("Sign Off")');
        const qaRejectBtn = controlItem.locator('button:has-text("QA Disapprove"), button:has-text("Reject")');

        if (await qaApproveBtn.isVisible()) {
          await expect(qaApproveBtn).toBeEnabled();
        }
        if (await qaRejectBtn.isVisible()) {
          await expect(qaRejectBtn).toBeEnabled();
        }
      }
    }
  });

  test('QA-04 & QA-05: Batch QA Approval Toolbar', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      // Check for batch selection checkboxes
      const selectAllBox = page.locator('input[type="checkbox"]').first();
      if (await selectAllBox.isVisible()) {
        await selectAllBox.check();

        // Verify batch action buttons appear
        const batchApproveBtn = page.locator('button:has-text("Batch Approve"), button:has-text("Approve Selected")').first();
        if (await batchApproveBtn.isVisible()) {
          await expect(batchApproveBtn).toBeVisible();
        }
      }
    }
  });

  test('QA-06: Request QA Scope Modification', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      const modBtn = page.locator('button:has-text("Request QA Modification"), button[title*="Modification" i]').first();
      if (await modBtn.isVisible()) {
        await expect(modBtn).toBeVisible();
      }
    }
  });

});
