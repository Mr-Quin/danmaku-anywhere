import { type BrowserContext, test as base, chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { attachConsoleWatcher, type ConsoleWatcher } from './console-watcher'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// e2e/setup/fixtures.ts → ../../build
const pathToExtension = path.join(__dirname, '..', '..', 'build')

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
    const watcher: ConsoleWatcher = attachConsoleWatcher(context)
    await use(watcher.getErrors)
  },
})

export const expect = test.expect
