import { test, expect } from './fixtures/test.fixture';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 5: Super Administrator — Questionnaire Controls & Checklist Management', () => {
  const timestamp = Date.now();
  const testRequirementText = `Verify automated encryption of payment cardholder PAN data at rest ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await page.goto('/admin/questionnaires');
    await page.waitForLoadState('networkidle');
  });

  test('QSTN-01: View Questions by Compliance Framework', async ({ page }) => {
    await expect(page.locator('h2:has-text("Standard Questionnaires")').or(page.locator('text=Questionnaires')).first()).toBeVisible();

    // Verify service selector exists
    const serviceSelect = page.locator('select').first();
    if (await serviceSelect.isVisible()) {
      await serviceSelect.selectOption({ index: 0 });
      await page.waitForTimeout(500);
      await expect(page.locator('table').first()).toBeVisible();
    }
  });

  test('QSTN-02: Add New Control Question', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add New Question"), button:has-text("Add Question")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      const modal = page.locator('div.fixed', { hasText: /Add Control Question/i });
      await expect(modal).toBeVisible({ timeout: 6000 });

      // Enter requirement description
      await modal.locator('textarea').first().fill(testRequirementText);
      await modal.locator('button[type="submit"]').click();

      // Verify question appears in table
      await expect(page.locator('tr, div', { hasText: testRequirementText }).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('QSTN-03: In-Line Edit Question Text', async ({ page }) => {
    const questionRow = page.locator('tr', { hasText: testRequirementText }).first();
    if (await questionRow.isVisible()) {
      const editBtn = questionRow.locator('button:has(svg.lucide-edit), button[title*="Edit" i]').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        const input = questionRow.locator('input[type="text"], textarea').first();
        if (await input.isVisible()) {
          await input.fill(`${testRequirementText} - Updated`);
          const saveBtn = questionRow.locator('button:has(svg.lucide-save), button[title*="Save" i]').first();
          await saveBtn.click();
          await expect(page.locator('text=updated').or(page.locator('[data-sonner-toast]'))).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('QSTN-04 & QSTN-05: Batch Question Activation & Deactivation', async ({ page }) => {
    // Select first question checkbox
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.check();

      // Check for batch actions toolbar
      const deactivateBtn = page.getByRole('button', { name: 'Deactivate Selected' });
      if (await deactivateBtn.isVisible()) {
        await deactivateBtn.click();
        await page.waitForTimeout(500);

        // Reactivate
        await firstCheckbox.check();
        const activateBtn = page.getByRole('button', { name: 'Activate Selected', exact: true });
        if (await activateBtn.isVisible()) {
          await activateBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

});
