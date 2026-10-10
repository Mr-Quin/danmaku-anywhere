import type { BrowserContext } from '@playwright/test'
import { waitForServiceWorker } from './da-client'

// The popup reads the platform from the SW on each request, so patching the
// worker is enough for the popup. Boot-time reads already happened.
export async function emulatePlatform(
  context: BrowserContext,
  os: chrome.runtime.PlatformOs
): Promise<void> {
  const sw = await waitForServiceWorker(context)
  await sw.evaluate((os) => {
    chrome.runtime.getPlatformInfo = async () => ({
      os,
      arch: 'arm64',
      nacl_arch: 'arm',
    })
  }, os)
}
