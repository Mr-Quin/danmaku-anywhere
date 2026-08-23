import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI
// A verification run is evidence a reviewer can watch, so it records the whole
// run rather than only what survived a failure.
const isVerify = !!process.env.DA_VERIFY

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/setup/globalSetup.ts',
  timeout: 30_000,
  retries: 0,
  // Real server for specs needing genuine cross-origin network (route-fulfilled
  // .invalid origins can't); other specs ignore it.
  webServer: {
    command: 'node e2e/harness/serve.mjs --port 8889',
    port: 8889,
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  reporter: isVerify
    ? [['list'], ['html', { open: 'never' }]]
    : isCI
      ? [
          ['list'],
          // JSON lives outside playwright-report/ because the HTML reporter
          // wipes its outputFolder before writing, which would clobber a
          // sibling JSON file.
          ['json', { outputFile: 'test-results/report.json' }],
          ['html', { open: 'never' }],
        ]
      : 'list',
  use: {
    // Extensions need the full chromium channel; the new headless mode loads
    // them fine, so headless is the default and DA_HEADED forces a window.
    channel: 'chromium',
    headless: !process.env.DA_HEADED,
    // Capture a full Playwright trace on failure so CI flakes don't
    // require re-running with extra instrumentation to diagnose.
    trace: isVerify ? 'on' : 'retain-on-failure',
    video: isVerify ? 'on' : 'off',
  },
})
