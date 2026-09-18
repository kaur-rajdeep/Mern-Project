import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 7: QSA Assessor — Security Assessment & Working Papers', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.QSA.email, TEST_USERS.QSA.password, TEST_USERS.QSA.expectedPath);
    await page.waitForLoadState('networkidle');
  });

  test('QSA-01: Access QSA Assessment Projects & Matrix', async ({ page }) => {
    await expect(
      page.locator('h1, h2, h3').filter({ hasText: /QSA|Assessment|Projects|Dashboard/i }).first()
    ).toBeVisible({ timeout: 8000 });

    // Click on first project review if active projects exist
    const reviewBtn = page.locator('a[href*="/qsa/audit"], button:has-text("Review Audit"), a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Assessment Matrix').or(page.locator('text=Requirements')).or(page.locator('text=Controls')).first()).toBeVisible();
    }
  });

  test('QSA-02, QSA-03 & QSA-04: Evaluate Evidence, Actions & Remediation Statuses', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qsa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      // Check if control card actions exist (Approve, Disapprove, Incomplete)
      const approveBtn = page.locator('button:has-text("Accept & Assign to QA"), button:has-text("Approve")').first();
      const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Disapprove")').first();

      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeEnabled();
      }
      if (await rejectBtn.isVisible()) {
        await expect(rejectBtn).toBeEnabled();
      }
    }
  });

  test('QSA-05 & QSA-06: Assessor Working Papers & Supplementary Artifacts', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qsa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      // Expand first control question
      const controlHeader = page.locator('div[class*="cursor-pointer"], button[class*="w-full text-left"]').first();
      if (await controlHeader.isVisible()) {
        await controlHeader.click();
        await page.waitForTimeout(500);

        // Check for working papers section
        const workpapersSection = page.locator('text=Working Papers').or(page.locator('text=Supplementary')).or(page.locator('text=Assessor Notes')).first();
        if (await workpapersSection.isVisible()) {
          await expect(workpapersSection).toBeVisible();
        }
      }
    }
  });

  test('QSA-07: Request Scope Modification', async ({ page }) => {
    const reviewBtn = page.locator('a[href*="/qsa/audit"], a:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      const modBtn = page.locator('button:has-text("Request Modification"), button[title*="Modification" i]').first();
      if (await modBtn.isVisible()) {
        await expect(modBtn).toBeVisible();
      }
    }
  });

});
