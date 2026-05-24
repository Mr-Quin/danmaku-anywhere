import { type BrowserContext, chromium } from '@playwright/test'
import { MIGRATION_EXTENSION_ID } from './extensionKey'

// --enable-unsafe-extension-debugging unlocks the CDP Extensions domain
// that swapExtension needs.
export async function launchExtension(
  userDataDir: string,
  extensionPath: string
): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      '--enable-unsafe-extension-debugging',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })
}

// Use CDP Extensions.loadUnpacked, not close + relaunch with a different
// --load-extension. Relaunch keeps Chrome's cached prior-SW bytecode and
// silently no-ops every migration.
export async function swapExtension(
  context: BrowserContext,
  extensionPath: string
): Promise<void> {
  const browser = context.browser()
  if (!browser) {
    throw new Error('swapExtension: no browser instance on context')
  }
  const cdp = await browser.newBrowserCDPSession()
  // biome-ignore lint/suspicious/noExplicitAny: CDP Extensions domain isn't typed
  const result = (await cdp.send(
    'Extensions.loadUnpacked' as any,
    {
      path: extensionPath,
      // biome-ignore lint/suspicious/noExplicitAny: see above
    } as any
  )) as { id?: string }
  if (result?.id !== MIGRATION_EXTENSION_ID) {
    throw new Error(
      `swap ID mismatch: expected ${MIGRATION_EXTENSION_ID}, got ${result?.id}. Both manifests must embed MIGRATION_EXTENSION_KEY.`
    )
  }
}
