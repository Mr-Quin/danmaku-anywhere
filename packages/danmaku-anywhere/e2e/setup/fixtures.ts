import { type BrowserContext, test as base, chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { attachConsoleWatcher, type ConsoleWatcher } from './console-watcher'
import {
  type AllowedNetworkPattern,
  attachNetworkWatcher,
  type NetworkWatcher,
} from './network-watcher'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// e2e/setup/fixtures.ts → ../../build
const pathToExtension = path.join(__dirname, '..', '..', 'build')

interface ContextWatchers {
  console: ConsoleWatcher
  network: NetworkWatcher
}

// Watchers are attached eagerly inside the context fixture (before the SW
// has a chance to boot) and looked up later by per-test fixtures.
// Playwright resolves fixtures in dependency order, so a fixture that
// depends only on `context` runs after the SW may have already emitted —
// Playwright doesn't buffer console events for existing workers.
const watchersByContext = new WeakMap<BrowserContext, ContextWatchers>()

export type ExpectedConsoleErrorPattern = string | RegExp
export type { AllowedNetworkPattern } from './network-watcher'

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  consoleErrors: () => string[]
  expectedConsoleErrors: ExpectedConsoleErrorPattern[]
  allowedNetworkOrigins: AllowedNetworkPattern[]
  _assertNoUnexpectedConsoleErrors: void
  _assertNoUnmockedNetwork: void
}>({
  // Per-test opt-out: override with `test.use({ expectedConsoleErrors: [...] })`
  // (or pass an array via `test('name', { expectedConsoleErrors: [...] })`)
  // to allow specific errors. Entries match by `includes` (string) or `.test`
  // (RegExp) against the formatted watcher entry — the line includes a
  // `[sw]`/`[page <url>]` prefix and a trailing `(<url>:<line>:<col>)`
  // location, not just the raw console message text. Patterns can target
  // any of those parts.
  expectedConsoleErrors: [[], { option: true }],

  // Per-test opt-in for extra origins; matched by `includes` (string) or
  // `.test` (RegExp). Project defaults (extension://, data:, blob:, about:,
  // *.invalid) are always allowed. Prefer a per-spec mock over widening this.
  allowedNetworkOrigins: [[], { option: true }],

  context: async ({ allowedNetworkOrigins }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    const consoleWatcher = attachConsoleWatcher(context)
    const networkWatcher = await attachNetworkWatcher(
      context,
      () => allowedNetworkOrigins
    )
    watchersByContext.set(context, {
      console: consoleWatcher,
      network: networkWatcher,
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker')
    }
    const extensionId = serviceWorker.url().split('/')[2]
    await use(extensionId)
  },
  consoleErrors: async ({ context }, use) => {
    const watchers = watchersByContext.get(context)
    if (!watchers) {
      throw new Error(
        'consoleErrors fixture used without a watcher attached to the context'
      )
    }
    await use(watchers.console.getErrors)
  },

  // Auto fixture: after every test, fail if any console errors slipped
  // through that weren't allow-listed via `expectedConsoleErrors`. Depends
  // on `context` so teardown runs before the context closes — keeping the
  // watcher reachable. Skipped when the test already failed so the real
  // failure isn't drowned out.
  _assertNoUnexpectedConsoleErrors: [
    async ({ context, expectedConsoleErrors }, use, testInfo) => {
      await use()
      if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
        return
      }
      const watchers = watchersByContext.get(context)
      if (!watchers) {
        return
      }
      const unexpected = watchers.console.getErrors().filter((err) => {
        return !expectedConsoleErrors.some((pattern) => {
          return typeof pattern === 'string'
            ? err.includes(pattern)
            : pattern.test(err)
        })
      })
      if (unexpected.length > 0) {
        const lines = unexpected.map((e) => `  - ${e}`).join('\n')
        throw new Error(
          `Unexpected console errors during test (${unexpected.length}):\n${lines}\n\nIf these are expected, allow them via test.use({ expectedConsoleErrors: [...] }).`
        )
      }
    },
    { auto: true },
  ],

  _assertNoUnmockedNetwork: [
    async ({ context }, use, testInfo) => {
      await use()
      if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
        return
      }
      const watchers = watchersByContext.get(context)
      if (!watchers) {
        return
      }
      const entries = watchers.network.getEntries()
      if (entries.length > 0) {
        const lines = entries.map((e) => `  - ${e}`).join('\n')
        throw new Error(
          `Unmocked network requests (${entries.length}):\n${lines}\n\nAdd a per-spec mock, or allow via test.use({ allowedNetworkOrigins: [...] }).`
        )
      }
    },
    { auto: true },
  ],
})

export const expect = test.expect
