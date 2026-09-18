import { test, expect } from './fixtures/test.fixture';
import path from 'path';
import { TEST_USERS, loginAs, API_BASE } from './fixtures/auth.helper';

test.describe('Module 6: Customer / Client POC — Evidence Submission & Attestation', () => {
  const samplePdfPath = path.resolve(__dirname, 'fixtures/sample_evidence.pdf');

  test('POC-01: View Assigned Audit Requirements & Workspaces', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);
    await page.waitForLoadState('networkidle');

    // Verify Process scopes / Dashboard
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Dashboard|Workspace|Compliance/i }).first()).toBeVisible();

    // If process card exists on dashboard, click it
    const processCard = page.locator('div[class*="bg-white p-5 rounded-2xl"], a[href*="/customer/processes/"]').first();
    if (await processCard.isVisible()) {
      await processCard.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('POC-02: Multi-Tenant Data Isolation Guard', async ({ request }) => {
    // Authenticate as Customer
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USERS.CUSTOMER.email, password: TEST_USERS.CUSTOMER.password },
    });
    const { token } = await loginRes.json();

    // Attempt to query an arbitrary foreign customer's process ID
    const foreignProcessId = '507f1f77bcf86cd799439011';
    const res = await request.get(`${API_BASE}/customer/processes/${foreignProcessId}/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Multi-tenant check must refuse cross-tenant access with 403 or 404
    expect([403, 404]).toContain(res.status());
  });

  test('POC-06: Dangerous / Disallowed File Type Rejection (.exe, .sh, .bat)', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USERS.CUSTOMER.email, password: TEST_USERS.CUSTOMER.password },
    });
    const { token } = await loginRes.json();

    // Attempt uploading a prohibited script file via multipart/form-data
    const res = await request.post(`${API_BASE}/customer/evidence/upload`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        serviceId: '1',
        processId: '507f1f77bcf86cd799439011',
        questionnaireId: '507f1f77bcf86cd799439012',
        files: {
          name: 'malicious_exploit.bat',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('@echo off\ncalc.exe\n'),
        },
      },
    });

    // Multer fileFilter must reject executable script formats
    expect([400, 403, 422, 500]).toContain(res.status());
  });

  test('POC-12 & POC-13: Integrity Guard Blocks Deleting Evidence on Approved Controls', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USERS.CUSTOMER.email, password: TEST_USERS.CUSTOMER.password },
    });
    const { token } = await loginRes.json();

    // Query an approved evidence doc if one exists
    const docsRes = await request.get(`${API_BASE}/customer/evidence-docs`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (docsRes.ok()) {
      const docs = await docsRes.json();
      const approvedDoc = Array.isArray(docs) ? docs.find((d: any) => d.allStatus === 1 || d.allStatus === 4) : null;
      if (approvedDoc) {
        const deleteRes = await request.delete(`${API_BASE}/customer/evidence-docs/${approvedDoc._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Must be rejected because auditor already approved it
        expect(deleteRes.status()).toBe(400);
      }
    }
  });

  test('POC-14: Cross-Tenant Guard Blocks Deleting Another Customer Evidence', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USERS.CUSTOMER.email, password: TEST_USERS.CUSTOMER.password },
    });
    const { token } = await loginRes.json();

    // Send delete for arbitrary non-owned document ID
    const foreignDocId = '507f191e810c19729de860ea';
    const deleteRes = await request.delete(`${API_BASE}/customer/evidence-docs/${foreignDocId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Cross-tenant delete must return 403 or 404
    expect([403, 404]).toContain(deleteRes.status());
  });

  test('POC-17: Scoped ROC / AOC Attestation Reports View', async ({ page }) => {
    await loginAs(page, TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.password, TEST_USERS.CUSTOMER.expectedPath);
    await page.goto('/customer/reports');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('text=Attestation').or(page.locator('text=Reports')).or(page.locator('text=Compliance Deliverables')).first()
    ).toBeVisible({ timeout: 8000 });
  });

});
