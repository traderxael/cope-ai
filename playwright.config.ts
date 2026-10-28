import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    acceptDownloads: true,
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      COPE_DEMO: '1',
      COPE_DEMO_DELAY_MS: '8',
      COPE_RATE_LIMIT_PER_MINUTE: '100',
      COPE_QUIZ_RATE_LIMIT_PER_MINUTE: '100',
      COPE_STUDY_RATE_LIMIT_PER_MINUTE: '100',
      COPE_ORAL_RATE_LIMIT_PER_MINUTE: '100',
      COPE_TTS_RATE_LIMIT_PER_MINUTE: '100',
      COPE_VOICE_CLONE_RATE_LIMIT_PER_MINUTE: '100',
    },
  },
});
