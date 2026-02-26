/**
 * Playwright script to record video demos of every screen in MyRoboTaxi.
 * Run: node scripts/record-demos.mjs
 *
 * Each use case gets its own browser context with video recording enabled.
 * Videos are saved to docs/videos/.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = resolve(__dirname, '..', 'docs', 'videos');
const BASE_URL = 'http://localhost:3001';

// iPhone 14 Pro viewport for mobile-first recording
const VIEWPORT = { width: 393, height: 852 };

mkdirSync(VIDEO_DIR, { recursive: true });

async function recordScene(browser, name, sceneFn) {
  console.log(`🎬 Recording: ${name}`);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await sceneFn(page);
  } catch (err) {
    console.error(`  ❌ Error in ${name}:`, err.message);
  }

  // Let the last frame linger
  await page.waitForTimeout(800);

  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    const srcPath = await video.path();
    // Rename to a clean filename
    const { renameSync } = await import('fs');
    const destPath = resolve(VIDEO_DIR, `${name}.webm`);
    try {
      renameSync(srcPath, destPath);
      console.log(`  ✅ Saved: docs/videos/${name}.webm`);
    } catch {
      console.log(`  ✅ Saved: ${srcPath}`);
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ──────────────────────────────────────────────
  // 1. Sign In — social auth buttons
  // ──────────────────────────────────────────────
  await recordScene(browser, '01-signin', async (page) => {
    await page.goto(`${BASE_URL}/signin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Hover each social auth button
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).hover();
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(1000);
  });

  // ──────────────────────────────────────────────
  // 2. Sign Up — form interaction
  // ──────────────────────────────────────────────
  await recordScene(browser, '02-signup', async (page) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill in the registration form
    await page.fill('input[placeholder="Full name"]', 'Thomas Nandola');
    await page.waitForTimeout(400);
    await page.fill('input[placeholder="Email address"]', 'thomas@myrobotaxi.com');
    await page.waitForTimeout(400);
    await page.fill('input[placeholder="Password"]', 'supersecret123');
    await page.waitForTimeout(400);

    // Hover the Create Account button
    const btn = page.locator('button:has-text("Create Account")');
    await btn.hover();
    await page.waitForTimeout(1000);
  });

  // ──────────────────────────────────────────────
  // 3. Home Map — bottom sheet toggle interaction
  // ──────────────────────────────────────────────
  await recordScene(browser, '03-home-map', async (page) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500); // Let map tiles load

    // Show the peek state
    await page.waitForTimeout(1500);

    // Click the drag handle to expand to half
    const dragHandle = page.locator('button[aria-label="Toggle vehicle details"]');
    if (await dragHandle.isVisible()) {
      await dragHandle.click();
      await page.waitForTimeout(2000);

      // Click again to collapse back to peek
      await dragHandle.click();
      await page.waitForTimeout(1500);
    }
  });

  // ──────────────────────────────────────────────
  // 4. Home Map — vehicle switching
  // ──────────────────────────────────────────────
  await recordScene(browser, '04-home-vehicle-switch', async (page) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Click on vehicle dot selectors to switch between vehicles
    const dots = page.locator('[class*="rounded-full"][class*="cursor-pointer"]');
    const dotCount = await dots.count();
    if (dotCount > 1) {
      for (let i = 1; i < Math.min(dotCount, 4); i++) {
        await dots.nth(i).click();
        await page.waitForTimeout(1500);
      }
      // Go back to first
      await dots.nth(0).click();
      await page.waitForTimeout(1500);
    }
  });

  // ──────────────────────────────────────────────
  // 5. Drive History — scrolling and interaction
  // ──────────────────────────────────────────────
  await recordScene(browser, '05-drive-history', async (page) => {
    await page.goto(`${BASE_URL}/drives`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Scroll down to show more drives
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
  });

  // ──────────────────────────────────────────────
  // 6. Drive Summary — route details
  // ──────────────────────────────────────────────
  await recordScene(browser, '06-drive-summary', async (page) => {
    await page.goto(`${BASE_URL}/drives/d1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Scroll down to see full summary
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Scroll further for timeline
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
  });

  // ──────────────────────────────────────────────
  // 7. Share / Invites
  // ──────────────────────────────────────────────
  await recordScene(browser, '07-invites', async (page) => {
    await page.goto(`${BASE_URL}/invites`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Scroll to show pending invites section
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
  });

  // ──────────────────────────────────────────────
  // 8. Settings — toggle interactions
  // ──────────────────────────────────────────────
  await recordScene(browser, '08-settings', async (page) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to toggle notification switches
    const toggles = page.locator('button[role="switch"]');
    const toggleCount = await toggles.count();
    for (let i = 0; i < Math.min(toggleCount, 3); i++) {
      await toggles.nth(i).click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1000);

    // Scroll down
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
  });

  // ──────────────────────────────────────────────
  // 9. Home Empty State
  // ──────────────────────────────────────────────
  await recordScene(browser, '09-home-empty', async (page) => {
    await page.goto(`${BASE_URL}/empty`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
  });

  // ──────────────────────────────────────────────
  // 10. Shared Viewer — anonymous experience
  // ──────────────────────────────────────────────
  await recordScene(browser, '10-shared-viewer', async (page) => {
    await page.goto(`${BASE_URL}/shared/abc123`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Toggle between peek and half states
    const toggleBtns = page.locator('button');
    const halfBtn = toggleBtns.filter({ hasText: 'half' });
    if (await halfBtn.isVisible()) {
      await halfBtn.click();
      await page.waitForTimeout(2000);

      const peekBtn = toggleBtns.filter({ hasText: 'peek' });
      await peekBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  // ──────────────────────────────────────────────
  // 11. Bottom Nav navigation flow
  // ──────────────────────────────────────────────
  await recordScene(browser, '11-navigation-flow', async (page) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate through bottom nav tabs
    const nav = page.locator('nav[aria-label="Main navigation"]');

    // Click Drives tab
    const drivesLink = nav.locator('a[href="/drives"]');
    if (await drivesLink.isVisible()) {
      await drivesLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Click Invites/Share tab
    const invitesLink = nav.locator('a[href="/invites"]');
    if (await invitesLink.isVisible()) {
      await invitesLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Click Settings tab
    const settingsLink = nav.locator('a[href="/settings"]');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Back to Home
    const homeLink = nav.locator('a[href="/"]');
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
  });

  await browser.close();
  console.log('\n🎉 All recordings complete! Videos in docs/videos/');
}

main().catch(console.error);
