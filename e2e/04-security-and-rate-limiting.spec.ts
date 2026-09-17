import { test, expect } from '@playwright/test';

test.describe('Module 11: Security Hardening & Rate Limiting Verification', () => {

  const API_BASE = 'http://localhost:5000/api';

  test('SEC-012: Production Security Headers & X-Powered-By Stripped', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.status()).toBe(200);

    const headers = res.headers();
    // Verify Helmet security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin');

    // Verify Express X-Powered-By banner is stripped
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('SEC-002: Unauthenticated File Download Attempt Blocked', async ({ request }) => {
    // Attempt to download a file without authentication token
    const res = await request.get(`${API_BASE}/files/download?path=evidence/nonexistent_test.pdf`);
    expect([401, 403]).toContain(res.status());
  });

  test('SEC-009: Forgot Password Anti-Enumeration Message', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/forgot-password`, {
      data: { email: 'completely.unknown.fake.account@panaceatest.com' },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('password recovery instructions');
  });

  test('SEC-010: Rate Limiting Rejection Displays "Servers are currently busy"', async ({ playwright }) => {
    // Create dedicated context without bypass header to test real rate limiting
    const directRequest = await playwright.request.newContext({ extraHTTPHeaders: {} });
    let hitRateLimit = false;
    let rateLimitMessage = '';

    // Trigger forgot password rate limit (configured for 5 req / 15m)
    for (let i = 0; i < 7; i++) {
      const res = await directRequest.post(`${API_BASE}/auth/forgot-password`, {
        data: { email: `ratelimit_probe_${i}@panaceatest.com` },
      });

      if (res.status() === 429) {
        hitRateLimit = true;
        const json = await res.json();
        rateLimitMessage = json.message || '';
        break;
      }
    }

    expect(hitRateLimit).toBe(true);
    expect(rateLimitMessage).toBe('Servers are currently busy. Please try again later.');
  });

});
