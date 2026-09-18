import { test as base, expect, Page, TestInfo } from '@playwright/test';

export interface DiagnosticTelemetry {
  consoleErrors: string[];
  pageExceptions: string[];
  failedNetworkRequests: {
    url: string;
    method: string;
    status: number;
    responseBody?: string;
  }[];
}

/**
 * Custom Playwright test fixture with built-in failure telemetry.
 * Automatically intercepts and captures:
 * 1. Uncaught browser exceptions (`pageerror`)
 * 2. Console errors (`console.error`)
 * 3. Failing HTTP requests (status >= 400 with payload & status)
 *
 * When any test fails or cracks, full diagnostic details are attached
 * to the test report to immediately pinpoint the root cause.
 */
export const test = base.extend<{ telemetry: DiagnosticTelemetry }>({
  request: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      extraHTTPHeaders: {
        'x-test-bypass': 'true',
      },
    });
    await use(apiContext);
    await apiContext.dispose();
  },
  page: async ({ page }, use, testInfo: TestInfo) => {
    const telemetry: DiagnosticTelemetry = {
      consoleErrors: [],
      pageExceptions: [],
      failedNetworkRequests: [],
    };

    // 0. Automatically route API requests to include test bypass header without breaking 3rd-party CORS
    await page.route('**/api/**', async (route) => {
      const headers = {
        ...route.request().headers(),
        'x-test-bypass': 'true',
      };
      await route.continue({ headers });
    });

    // 1. Capture browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        telemetry.consoleErrors.push(
          `[Console Error] ${msg.text()} (${msg.location()?.url || 'unknown'}:${msg.location()?.lineNumber || '0'})`
        );
      }
    });

    // 2. Capture uncaught page script exceptions
    page.on('pageerror', (exception) => {
      telemetry.pageExceptions.push(
        `[Page Exception] ${exception.name}: ${exception.message}\nStack: ${exception.stack || 'N/A'}`
      );
    });

    // 3. Capture failing API responses (>= 400)
    page.on('response', async (res) => {
      // Exclude expected negative test paths
      const url = res.url();
      const isExpectedNegative =
        url.includes('/auth/forgot-password') ||
        url.includes('/files/download?path=') ||
        url.includes('/api/auth/login');

      if (res.status() >= 400 && !isExpectedNegative) {
        let bodySnippet = '';
        try {
          bodySnippet = await res.text();
          if (bodySnippet.length > 800) {
            bodySnippet = bodySnippet.slice(0, 800) + '... (truncated)';
          }
        } catch {
          bodySnippet = '<unreadable body>';
        }

        telemetry.failedNetworkRequests.push({
          url: res.url(),
          method: res.request().method(),
          status: res.status(),
          responseBody: bodySnippet,
        });
      }
    });

    // Run the test
    await use(page);

    // On test failure, enrich report with complete telemetry
    if (testInfo.status !== testInfo.expectedStatus) {
      if (telemetry.consoleErrors.length > 0) {
        await testInfo.attach('browser-console-errors', {
          body: telemetry.consoleErrors.join('\n'),
          contentType: 'text/plain',
        });
      }

      if (telemetry.pageExceptions.length > 0) {
        await testInfo.attach('uncaught-page-exceptions', {
          body: telemetry.pageExceptions.join('\n\n'),
          contentType: 'text/plain',
        });
      }

      if (telemetry.failedNetworkRequests.length > 0) {
        await testInfo.attach('failed-network-requests', {
          body: JSON.stringify(telemetry.failedNetworkRequests, null, 2),
          contentType: 'application/json',
        });
      }
    }
  },
});

export { expect };
