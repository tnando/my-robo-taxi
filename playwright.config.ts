import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';

// Load .env.local so DATABASE_URL and AUTH_SECRET are available to Playwright
// setup scripts (prisma db push/seed, JWT generation).
loadEnvConfig(process.cwd());

/**
 * Playwright E2E test configuration for MyRoboTaxi.
 *
 * Two projects:
 *   1. "setup" — seeds the database and creates an authenticated session cookie.
 *   2. "chromium" — runs all E2E tests using the saved auth session.
 *
 * Mobile-first: 390x844 viewport, 2x scale, dark color scheme (matches demo scripts).
 * Uses SwiftShader for software WebGL rendering (Mapbox GL needs WebGL).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
        storageState: 'e2e/.auth/session.json',
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader'],
        },
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
