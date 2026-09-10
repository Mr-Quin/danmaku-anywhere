import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: true,
  forbidOnly: isCI,
  reporter: isCI
    ? [
        ['list'],
        ['json', { outputFile: 'test-results/report.json' }],
        ['html', { open: 'never' }],
      ]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chromium',
    headless: !process.env.PLAYWRIGHT_HEADED,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm serve:e2e',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
