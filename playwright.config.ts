import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load base .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Optionally load environment-specific .env if TEST_ENV is set (.env.local or .env.dev)
const testEnv = (process.env.TEST_ENV || 'local').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, `.env.${testEnv}`), override: true });

const isDev = testEnv === 'dev' || testEnv === 'development';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  (isDev ? process.env.DEV_BASE_URL : process.env.LOCAL_BASE_URL) ||
  'http://localhost:5173';

const headless = process.env.HEADLESS !== undefined ? process.env.HEADLESS === 'true' : true;
const browserChannel = process.env.BROWSER_CHANNEL || 'chrome';

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
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    channel: browserChannel,
    headless,
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        channel: browserChannel,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});

