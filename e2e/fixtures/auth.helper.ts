import { Page, expect } from '@playwright/test';

export const TEST_USERS = {
  ADMIN: {
    email: 'panacea@yopmail.com',
    password: 'guru@1234',
    expectedPath: '/admin/dashboard',
  },
  CUSTOMER: {
    email: 'customer@panaceatest.com',
    password: 'Password@123',
    expectedPath: '/customer/dashboard',
  },
  QSA: {
    email: 'qsa@panaceatest.com',
    password: 'Password@123',
    expectedPath: '/qsa/dashboard',
  },
  QA: {
    email: 'qa@panaceatest.com',
    password: 'Password@123',
    expectedPath: '/qa/dashboard',
  },
  CONSULTANT: {
    email: 'consultant@panaceatest.com',
    password: 'Password@123',
    expectedPath: '/consultant/dashboard',
  },
};

export async function loginAs(page: Page, email: string, password: string, expectedPath?: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  if (expectedPath) {
    await page.waitForURL(`**${expectedPath}*`, { timeout: 10000 });
    expect(page.url()).toContain(expectedPath);
  }
}
