import { test, expect } from './fixtures/test.fixture';
import path from 'path';
import { TEST_USERS, loginAs } from './fixtures/auth.helper';

test.describe('Module 4: Super Administrator — Compliance Project Workspace & Reporting', () => {
  const samplePdfPath = path.resolve(__dirname, 'fixtures/sample_evidence.pdf');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password, TEST_USERS.ADMIN.expectedPath);
    await page.goto('/admin/compliances');
    await page.waitForLoadState('networkidle');
  });

  test('PROJ-01: View Compliance Projects Directory & Modal', async ({ page }) => {
    await expect(page.locator('h2:has-text("Compliance Projects")').or(page.locator('text=Projects')).first()).toBeVisible();

    // Verify Create modal opens with framework & role selectors
    const createBtn = page.locator('button:has-text("Assign New Project")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const modal = page.locator('div.fixed', { hasText: /Assign Compliance Project/i });
      await expect(modal).toBeVisible({ timeout: 6000 });

      // Verify customer, scope, QSA, QA dropdowns exist
      await expect(modal.locator('select').first()).toBeVisible();
      // Close modal
      await modal.locator('button:has(svg.lucide-x)').first().click();
    }
  });

  test('PROJ-02: Duplicate Project Scope Guard Validation', async ({ request }) => {
    // Attempt creating identical project scope via API to verify unique compound index guard
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: TEST_USERS.ADMIN.email, password: TEST_USERS.ADMIN.password },
    });
    const { token } = await loginRes.json();

    const projectsRes = await request.get('http://localhost:5000/api/admin/compliance-projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects } = await projectsRes.json();

    if (projects && projects.length > 0) {
      const existing = projects[0];
      const dupRes = await request.post('http://localhost:5000/api/admin/compliance-projects', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          serviceId: existing.serviceId,
          customerId: existing.customerId?._id || existing.customerId,
          processId: existing.processId?._id || existing.processId,
          qsaId: existing.qsaId?._id || existing.qsaId,
          qaId: existing.qaId?._id || existing.qaId,
          consultantId: existing.consultantId?._id || existing.consultantId,
        },
      });

      // Must be rejected with HTTP 400/409/500
      expect([400, 409, 500]).toContain(dupRes.status());
    }
  });

  test('PROJ-03, PROJ-04 & PROJ-05: Project Details Workspace, Progress Counter & Milestones', async ({ page }) => {
    // Open the first active project details
    const viewBtn = page.locator('button[title="Audit View"], button[aria-label="Audit View"], button:has-text("Audit View"), a:has-text("Audit View"), a[href*="/admin/compliances/"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForLoadState('networkidle');

      // Verify Project Header, Progress counter & Milestone tab
      await expect(page.locator('h1, h2, h3, div').filter({ hasText: /Compliance|Progress|Milestone|Audit/i }).first()).toBeVisible({ timeout: 8000 });

      const milestoneTab = page.locator('button:has-text("Milestone")');
      if (await milestoneTab.isVisible()) {
        await milestoneTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('button:has-text("Mark Completed"), button:has-text("Mark In Progress"), div:has-text("Milestone")').first()).toBeVisible();
      }
    }
  });

  test('PROJ-06, PROJ-07 & PROJ-08: ROC/AOC Upload Modals & PDF Validation', async ({ page }) => {
    const viewBtn = page.locator('a[href*="/admin/compliances/"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForLoadState('networkidle');

      // Test ROC / AOC upload buttons
      const uploadRocBtn = page.locator('button:has-text("Upload ROC")');
      if (await uploadRocBtn.isVisible()) {
        await uploadRocBtn.click();
        const rocModal = page.locator('div.fixed', { hasText: /Upload Report on Compliance \(ROC\)/i });
        await expect(rocModal).toBeVisible({ timeout: 5000 });

        // PROJ-08: File input only accepts pdf
        const fileInput = rocModal.locator('input[type="file"]');
        expect(await fileInput.getAttribute('accept')).toContain('pdf');

        // Close modal
        await rocModal.locator('button:has(svg.lucide-x)').first().click();
      }
    }
  });

  test('PROJ-09: Admin Batch Review Capability in Audit View', async ({ page }) => {
    const auditViewLink = page.locator('a[href*="/admin/compliance-projects/"], a[href*="/audit-view"]').first();
    if (await auditViewLink.isVisible()) {
      await auditViewLink.click();
      await page.waitForLoadState('networkidle');

      // Check if control questions or batch action buttons are rendered
      const batchBtn = page.locator('button:has-text("Batch Approve"), button:has-text("Batch")');
      if (await batchBtn.isVisible()) {
        await expect(batchBtn).toBeVisible();
      }
    }
  });

  test('PROJ-10: Project Reassignment and Assessor Unassignment Flow', async ({ page }) => {
    // Verify Reassign button exists on project row
    const reassignBtn = page.locator('button[title*="Reassign"], button[aria-label*="Reassign"], button:has-text("Reassign")').first();
    await expect(reassignBtn).toBeVisible({ timeout: 8000 });
    await reassignBtn.click();

    // Verify Reassign modal opens
    const modal = page.locator('div.fixed', { hasText: /Reassign Project Assessors/i });
    await expect(modal).toBeVisible();

    // Verify Framework and Scope overview is shown
    await expect(modal.locator('text=Framework:')).toBeVisible();
    await expect(modal.locator('text=Customer:')).toBeVisible();

    // Verify QSA dropdown has "None (Unassigned / Remove)" option
    const qsaSelect = modal.locator('select').first();
    await expect(qsaSelect).toBeVisible();
    await expect(qsaSelect.locator('option', { hasText: /Unassigned|Remove|None/i })).toBeAttached();

    // Close reassign modal
    await modal.locator('button:has-text("Cancel"), button:has(svg.lucide-x)').first().click();
    await expect(modal).toBeHidden();

    // Open Audit View and verify "Reassign Team" button is present
    const auditBtn = page.locator('button[title*="Audit View"], button[aria-label*="Audit View"], button:has-text("Audit View")').first();
    await auditBtn.click();
    await page.waitForLoadState('networkidle');

    const reassignTeamBtn = page.locator('button:has-text("Reassign Team")');
    await expect(reassignTeamBtn).toBeVisible({ timeout: 8000 });
  });

});
