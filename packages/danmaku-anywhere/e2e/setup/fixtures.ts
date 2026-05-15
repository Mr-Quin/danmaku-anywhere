import { type BrowserContext, test as base, chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { attachConsoleWatcher, type ConsoleWatcher } from './console-watcher'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// e2e/setup/fixtures.ts → ../../build
const pathToExtension = path.join(__dirname, '..', '..', 'build')

// Watchers are attached eagerly inside the context fixture (before the SW
// has a chance to boot) and looked up later by the consoleErrors fixture.
// Playwright resolves fixtures in dependency order, so a fixture that
// depends only on `context` runs after the SW may have already emitted —
// Playwright doesn't buffer console events for existing workers.
const watchersByContext = new WeakMap<BrowserContext, ConsoleWatcher>()

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  consoleErrors: () => string[]
}>({
  // biome-ignore lint: Playwright fixture pattern requires destructuring
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    watchersByContext.set(context, attachConsoleWatcher(context))
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
    const watcher = watchersByContext.get(context)
    if (!watcher) {
      throw new Error(
        'consoleErrors fixture used without a watcher attached to the context'
      )
    }
    await use(watcher.getErrors)
  },
})

export const expect = test.expect
