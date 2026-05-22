import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: isCI
    ? [
        ['list'],
        ['json', { outputFile: 'playwright-report/report.json' }],
        ['html', { open: 'never' }],
      ]
    : 'list',
  use: {
    // Extensions require the full chromium channel and headed mode
    channel: 'chromium',
    headless: false,
    // Capture a full Playwright trace on failure so CI flakes don't
    // require re-running with extra instrumentation to diagnose.
    trace: 'retain-on-failure',
  },
})
