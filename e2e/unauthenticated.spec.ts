import { test, expect } from '@playwright/test';

/**
 * Unauthenticated user flows — no session cookie.
 * Uses default project (no storageState) so requests hit the auth middleware.
 */
test.describe('unauthenticated redirects', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting / redirects to /signin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('visiting /drives redirects to /signin with callbackUrl', async ({ page }) => {
    await page.goto('/drives');
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdrives/);
  });

  test('sign-in page renders Google button', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('visiting /signup redirects to /signin', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/signin/);
  });
});
