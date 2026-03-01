import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';

const BASE = 'http://localhost:3000';
const OUT = './demos';
mkdirSync(OUT, { recursive: true });

const demos = [
  {
    name: '01-protected-redirect',
    description: 'Visit / while signed out → redirects to /signin',
    steps: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForURL('**/signin', { timeout: 10000 });
      // Wait for sign-in page content to render
      await page.waitForSelector('button', { timeout: 5000 });
      await page.waitForTimeout(2000);
    },
  },
  {
    name: '02-shared-route-redirect',
    description: 'Visit /shared/demo-token while signed out → redirects to /signin',
    steps: async (page) => {
      await page.goto(`${BASE}/shared/demo-token`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForURL('**/signin', { timeout: 10000 });
      await page.waitForSelector('button', { timeout: 5000 });
      await page.waitForTimeout(2000);
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  });

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
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });

  for (const demo of demos) {
    await recordDemo(browser, demo);
  }

  await browser.close();
  console.log('\nDone! Demos in demos/');
}

run().catch(console.error);
