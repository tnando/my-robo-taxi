import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const BASE = 'http://localhost:3000';
const OUT = './demos';
const AUTH_FILE = '.playwright-auth.json';
mkdirSync(OUT, { recursive: true });

/**
 * Each demo has:
 * - name: output filename (without extension)
 * - description: logged to console
 * - authenticated: false = no session (redirect demos), true = uses saved session
 * - steps: async function that drives the page
 */
const demos = [
  {
    name: '01-protected-redirect',
    description: 'Visit / while signed out → redirects to /signin',
    authenticated: false,
    steps: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('button', { timeout: 10000 });
      await page.waitForTimeout(2000);
    },
  },
  {
    name: '02-shared-redirect-with-callback',
    description: 'Visit /shared/demo-token signed out → redirects to /signin?callbackUrl=/shared/demo-token',
    authenticated: false,
    steps: async (page) => {
      await page.goto(`${BASE}/shared/demo-token`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('button', { timeout: 10000 });
      await page.waitForTimeout(2000);
    },
  },
  {
    name: '03-shared-viewer-peek',
    description: 'Shared viewer — authenticated peek state with bottom sheet',
    authenticated: true,
    steps: async (page) => {
      await page.goto(`${BASE}/shared/test-token`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Wait for map + bottom sheet to render
      await page.waitForSelector('[aria-label="Vehicle details"]', { timeout: 10000 });
      await page.waitForTimeout(3000);
    },
  },
  {
    name: '04-shared-viewer-drag',
    description: 'Shared viewer — drag bottom sheet from peek to half',
    authenticated: true,
    steps: async (page) => {
      await page.goto(`${BASE}/shared/test-token`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('[aria-label="Vehicle details"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      // Click the drag handle to toggle to half state
      const handle = page.getByRole('separator', { name: 'Toggle vehicle details' });
      await handle.click();
      await page.waitForTimeout(2500);
    },
  },
];

function webmToGif(webmPath, gifPath) {
  // Two-pass palette approach for good quality at reasonable file size
  execSync(
    `ffmpeg -y -i "${webmPath}" -vf "fps=12,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gifPath}"`,
    { stdio: 'pipe' }
  );
}

async function recordDemo(browser, demo) {
  console.log(`Recording: ${demo.name} — ${demo.description}`);
  const ctxOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  };
  if (demo.authenticated && existsSync(AUTH_FILE)) {
    ctxOptions.storageState = AUTH_FILE;
  }
  const ctx = await browser.newContext(ctxOptions);

  const page = await ctx.newPage();
  try {
    await demo.steps(page);
  } catch (e) {
    console.error(`  FAIL ${demo.name}: ${e.message}`);
  }
  await page.close();
  await ctx.close();

  const videoPath = await page.video().path();
  const gifPath = `${OUT}/${demo.name}.gif`;

  try {
    webmToGif(videoPath, gifPath);
    rmSync(videoPath);
    console.log(`  OK ${demo.name} -> ${gifPath}`);
  } catch (e) {
    console.error(`  FAIL ${demo.name} gif conversion: ${e.message}`);
  }
}

async function run() {
  const hasAuth = existsSync(AUTH_FILE);
  if (!hasAuth) {
    console.log('Warning: No auth session found — authenticated demos will be skipped');
    console.log('Run `node scripts/save-auth.mjs` to create one\n');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });

  for (const demo of demos) {
    if (demo.authenticated && !hasAuth) {
      console.log(`Skipping: ${demo.name} (requires auth)`);
      continue;
    }
    await recordDemo(browser, demo);
  }

  await browser.close();
  console.log('\nDone! Demos in demos/');
}

run().catch(console.error);
