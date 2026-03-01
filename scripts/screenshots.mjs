import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = './screenshots';
const AUTH_FILE = '.playwright-auth.json';
mkdirSync(OUT, { recursive: true });

const pages = [
  { path: '/signin', name: '01-signin' },
  { path: '/signup', name: '02-signup' },
  { path: '/', name: '03-home-map' },
  { path: '/drives', name: '04-drive-history' },
  { path: '/drives/1', name: '05-drive-summary' },
  { path: '/invites', name: '06-invites' },
  { path: '/settings', name: '07-settings' },
  { path: '/empty', name: '08-home-empty' },
  { path: '/shared/demo-token', name: '09-shared-viewer' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctxOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  };
  if (existsSync(AUTH_FILE)) {
    ctxOptions.storageState = AUTH_FILE;
    console.log('Using saved auth session');
  } else {
    console.log('No auth session found — run `node scripts/save-auth.mjs` first');
  }
  const ctx = await browser.newContext(ctxOptions);

  for (const { path, name } of pages) {
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
      // Wait a bit for animations/map to render
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
      console.log(`✓ ${name}`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
}

run().catch(console.error);
