/**
 * Opens a browser for manual Google sign-in, then saves the session
 * to .playwright-auth.json for use by screenshot/demo scripts.
 *
 * Usage: node scripts/save-auth.mjs
 *
 * Sign in via Google in the opened browser, wait for redirect to /,
 * then press Enter in the terminal to save and close.
 */
import { chromium } from 'playwright';
import { createInterface } from 'readline';

const BASE = 'http://localhost:3000';
const AUTH_FILE = '.playwright-auth.json';

async function run() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });

  const page = await ctx.newPage();
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });

  console.log('\n  Sign in with Google in the browser window.');
  console.log('  Once you see the home screen, come back here and press Enter.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question('  Press Enter to save session...', resolve));
  rl.close();

  await ctx.storageState({ path: AUTH_FILE });
  console.log(`\n  Session saved to ${AUTH_FILE}`);

  await browser.close();
}

run().catch(console.error);
