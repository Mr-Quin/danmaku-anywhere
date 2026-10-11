import { defineConfig } from '@playwright/test'

// Regenerates committed migration fixtures by driving a prior release. Not part
// of the test suite: run it by hand when a fixture needs to change.
export default defineConfig({
  testDir: '.',
  testMatch: '*.gen.ts',
  timeout: 120_000,
  reporter: 'list',
  use: {
    channel: 'chromium',
    headless: true,
  },
})
