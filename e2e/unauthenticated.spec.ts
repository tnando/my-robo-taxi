import { test, expect } from '@playwright/test';

/**
 * Unauthenticated user flows — no session cookie but beta-access granted.
 * Beta cookie included so these tests exercise the auth middleware, not the beta gate.
 */
const BETA_STORAGE = {
  cookies: [
    {
      name: 'beta-access',
      value: 'granted',
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ],
  origins: [] as { origin: string; localStorage: { name: string; value: string }[] }[],
};

test.describe('unauthenticated redirects', () => {
  test.use({ storageState: BETA_STORAGE });

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
