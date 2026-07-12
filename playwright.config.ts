import {defineConfig} from '@playwright/test';

const unitTest = '**/framed-picture.spec.ts';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  projects: [
    {
      name: 'unit',
      testMatch: unitTest,
    },
    {
      name: 'e2e',
      testIgnore: unitTest,
      use: {
        baseURL: 'http://localhost:3002',
        trace: 'on-first-retry',
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_E2E
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
