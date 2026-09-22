import { Page, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load base .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const testEnv = (process.env.TEST_ENV || 'local').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, `../../.env.${testEnv}`), override: true });

const isDev = testEnv === 'dev' || testEnv === 'development';

export const API_BASE =
  process.env.PLAYWRIGHT_API_URL ||
  (isDev ? process.env.DEV_API_URL : process.env.LOCAL_API_URL) ||
  'http://localhost:5000/api';

const defaultPassword = process.env.DEFAULT_TEST_PASSWORD || 'Password@123';

export const TEST_USERS = {
  ADMIN: {
    email:
      process.env.ADMIN_EMAIL ||
      (isDev ? process.env.DEV_ADMIN_EMAIL : process.env.LOCAL_ADMIN_EMAIL) ||
      'panacea@endtest-mail.io',
    password:
      process.env.ADMIN_PASSWORD ||
      (isDev ? process.env.DEV_ADMIN_PASSWORD : process.env.LOCAL_ADMIN_PASSWORD) ||
      'guru@1234',
    expectedPath: process.env.ADMIN_EXPECTED_PATH || '/admin/dashboard',
  },
  CUSTOMER: {
    email:
      process.env.CUSTOMER_EMAIL ||
      (isDev ? process.env.DEV_CUSTOMER_EMAIL : process.env.LOCAL_CUSTOMER_EMAIL) ||
      'customer@endtest-mail.io',
    password:
      process.env.CUSTOMER_PASSWORD ||
      (isDev ? process.env.DEV_CUSTOMER_PASSWORD : process.env.LOCAL_CUSTOMER_PASSWORD) ||
      defaultPassword,
    expectedPath: process.env.CUSTOMER_EXPECTED_PATH || '/customer/dashboard',
  },
  QSA: {
    email:
      process.env.QSA_EMAIL ||
      (isDev ? process.env.DEV_QSA_EMAIL : process.env.LOCAL_QSA_EMAIL) ||
      'qsa@endtest-mail.io',
    password:
      process.env.QSA_PASSWORD ||
      (isDev ? process.env.DEV_QSA_PASSWORD : process.env.LOCAL_QSA_PASSWORD) ||
      defaultPassword,
    expectedPath: process.env.QSA_EXPECTED_PATH || '/qsa/dashboard',
  },
  QA: {
    email:
      process.env.QA_EMAIL ||
      (isDev ? process.env.DEV_QA_EMAIL : process.env.LOCAL_QA_EMAIL) ||
      'qa@endtest-mail.io',
    password:
      process.env.QA_PASSWORD ||
      (isDev ? process.env.DEV_QA_PASSWORD : process.env.LOCAL_QA_PASSWORD) ||
      defaultPassword,
    expectedPath: process.env.QA_EXPECTED_PATH || '/qa/dashboard',
  },
  CONSULTANT: {
    email:
      process.env.CONSULTANT_EMAIL ||
      (isDev ? process.env.DEV_CONSULTANT_EMAIL : process.env.LOCAL_CONSULTANT_EMAIL) ||
      'consultant@endtest-mail.io',
    password:
      process.env.CONSULTANT_PASSWORD ||
      (isDev ? process.env.DEV_CONSULTANT_PASSWORD : process.env.LOCAL_CONSULTANT_PASSWORD) ||
      defaultPassword,
    expectedPath: process.env.CONSULTANT_EXPECTED_PATH || '/consultant/dashboard',
  },
};

export async function loginAs(page: Page, email: string, password: string, expectedPath?: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 2500 })) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
  }

  if (expectedPath) {
    await page.waitForURL(`**${expectedPath}*`, { timeout: 12000 });
    expect(page.url()).toContain(expectedPath);
  }
}

