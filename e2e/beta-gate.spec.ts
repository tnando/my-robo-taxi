import { test, expect } from '@playwright/test';

/**
 * Beta access gate E2E tests.
 * Uses empty cookies (no session, no beta-access) to test the gate flow.
 * Requires BETA_ACCESS_PASSWORD to be set in .env.local.
 */
test.describe('beta access gate', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.skip(
    !process.env.BETA_ACCESS_PASSWORD,
    'BETA_ACCESS_PASSWORD not set — beta gate disabled',
  );

  test('visiting / without cookies redirects to /beta', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/beta/);
  });

  test('visiting /drives without cookies redirects to /beta', async ({ page }) => {
    await page.goto('/drives');
    await expect(page).toHaveURL(/\/beta/);
  });

  test('/beta page renders title and password input', async ({ page }) => {
    await page.goto('/beta');
    await expect(page.getByText('MYROBOTAXI')).toBeVisible();
    await expect(page.getByPlaceholder('Enter access code')).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/beta');
    const input = page.getByPlaceholder('Enter access code');

    await input.fill('wrong-password');
    await input.press('Enter');

    await expect(page.getByText('Invalid access code')).toBeVisible();
  });

  test('correct password redirects to /signin', async ({ page }) => {
    const password = process.env.BETA_ACCESS_PASSWORD!;
    await page.goto('/beta');
    const input = page.getByPlaceholder('Enter access code');

    await input.fill(password);
    await input.press('Enter');

    await expect(page).toHaveURL(/\/signin/, { timeout: 5_000 });
  });

  test('/api/auth/providers is accessible without beta cookie', async ({ page }) => {
    const response = await page.goto('/api/auth/providers');
    expect(response?.status()).toBe(200);
  });
});
