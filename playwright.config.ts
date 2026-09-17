import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential execution to avoid DB state conflicts
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    channel: 'chrome', // Use local Google Chrome
    headless: true,
    extraHTTPHeaders: {
      'x-test-bypass': 'true',
    },
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
