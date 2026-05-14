import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    // Extensions require the full chromium channel and headed mode
    channel: 'chromium',
    headless: false,
  },
})
