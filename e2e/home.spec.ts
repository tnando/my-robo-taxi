import { test, expect } from '@playwright/test';

/**
 * Home screen — authenticated user with seeded vehicles.
 * Uses the saved auth session from the setup project.
 */
test.describe('home screen', () => {
  test('renders with vehicle name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Midnight Runner')).toBeVisible({ timeout: 15_000 });
  });

  test('vehicle dot selector is visible with 2 dots', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Midnight Runner')).toBeVisible({ timeout: 15_000 });

    const dots = page.getByRole('button', { name: /select/i });
    await expect(dots).toHaveCount(2);
  });

  test('tapping second dot switches to Pearl', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Midnight Runner')).toBeVisible({ timeout: 15_000 });

    const secondDot = page.getByRole('button', { name: /select pearl/i });
    await secondDot.click();
    await expect(page.getByText('Pearl')).toBeVisible();
  });

  test('bottom sheet is visible with vehicle stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Midnight Runner')).toBeVisible({ timeout: 15_000 });

    const bottomSheet = page.getByRole('region', { name: /vehicle details/i });
    await expect(bottomSheet).toBeVisible();
  });

  test('setup stepper is not shown for fully connected vehicles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Midnight Runner')).toBeVisible({ timeout: 15_000 });

    // Seeded vehicles have setupStatus: 'connected' — stepper should not appear
    await expect(page.getByText('Complete Vehicle Setup')).not.toBeVisible();
  });
});
