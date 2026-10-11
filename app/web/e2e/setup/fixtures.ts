import { type BrowserContext, test as base, type Page } from '@playwright/test'
import { attachConsoleWatcher, type ConsoleWatcher } from './console-watcher'
import {
  type AllowedNetworkPattern,
  attachNetworkWatcher,
  type NetworkWatcher,
} from './network-watcher'

interface ContextWatchers {
  console: ConsoleWatcher
  network: NetworkWatcher
}

const watchersByContext = new WeakMap<BrowserContext, ContextWatchers>()

export type ExpectedConsoleErrorPattern = string | RegExp
export type { AllowedNetworkPattern } from './network-watcher'

export interface FakeControl {
  latencyMs?: number
  fail?: string[]
}

export const test = base.extend<{
  fakeBackend: FakeControl
  consoleErrors: () => string[]
  expectedConsoleErrors: ExpectedConsoleErrorPattern[]
  allowedNetworkOrigins: AllowedNetworkPattern[]
  _assertNoUnexpectedConsoleErrors: void
  _assertNoUnmockedNetwork: void
}>({
  // See e2e/AGENTS.md → Baselines for the opt-out / opt-in contract.
  fakeBackend: [{}, { option: true }],
  expectedConsoleErrors: [[], { option: true }],
  allowedNetworkOrigins: [[], { option: true }],

  context: async ({ context, allowedNetworkOrigins }, use) => {
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
  },

  // Seed the fake-control seam before any app code runs so specs can inject
  // deterministic latency/failures and the page never touches the network.
  page: async ({ page, fakeBackend }, use) => {
    await page.addInitScript((cfg: FakeControl) => {
      ;(window as unknown as { __DA_FAKE__?: FakeControl }).__DA_FAKE__ = cfg
    }, fakeBackend)
    await use(page)
  },

  consoleErrors: async ({ context }, use) => {
    const watchers = watchersByContext.get(context)
    if (!watchers) {
      throw new Error('consoleErrors used without a watcher on the context')
    }
    await use(watchers.console.getErrors)
  },

  // Skipped when the test already failed so a real failure isn't drowned out.
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
          `Unexpected network requests to non-allow-listed origins (${entries.length}):\n${lines}\n\nA non-localhost hit means fake mode leaked to a real backend. Fix the fake, do not allow-list it.`
        )
      }
    },
    { auto: true },
  ],
})

export const expect = test.expect

// Boots the app at `/`, waits through the auto-completing onboarding redirect,
// and resolves once the lane shell and its first trending card are on screen.
export async function bootApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.locator('[data-testid="app-shell"]').waitFor({ state: 'visible' })
  await page
    .locator('[data-testid="show-card"]')
    .first()
    .waitFor({ state: 'visible' })
}

// Boots, then reloads once. Onboarding installs the recommended kazumi policies
// into IndexedDB during its first run but does not refetch the policy query in
// the same session, so the kazumi search lane reads zero rules until the next
// navigation. The reload (onboarding already accepted) reads the seeded rules
// from IndexedDB, which is the state any returning user lands in.
export async function bootAppWithKazumiRules(page: Page): Promise<void> {
  await bootApp(page)
  await page.reload()
  await page.locator('[data-testid="app-shell"]').waitFor({ state: 'visible' })
  await page
    .locator('[data-testid="show-card"]')
    .first()
    .waitFor({ state: 'visible' })
}
