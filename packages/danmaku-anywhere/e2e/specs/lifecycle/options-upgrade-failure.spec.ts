import type { Worker } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * An options upgrade that cannot write to sync storage leaves the popup on a
 * failure screen with a Retry button, not a blank page. Once sync writes work
 * again, Retry upgrades the stores and the popup opens its pages.
 */

test.use({
  expectedConsoleErrors: ['Failed to upgrade', 'Options upgrade failed'],
})

// Stands in for a full sync quota: every sync write in the service worker
// rejects until the returned function restores the real one.
async function failSyncWrites(sw: Worker): Promise<() => Promise<void>> {
  await sw.evaluate(() => {
    const area = chrome.storage.sync
    const original = area.set
    Object.defineProperty(globalThis, '__daRestoreSyncSet', {
      configurable: true,
      value: () => {
        Object.defineProperty(area, 'set', {
          configurable: true,
          writable: true,
          value: original,
        })
      },
    })
    Object.defineProperty(area, 'set', {
      configurable: true,
      writable: true,
      value: () => {
        return Promise.reject(new Error('QUOTA_BYTES quota exceeded'))
      },
    })
  })
  return async () => {
    await sw.evaluate(() => {
      Reflect.get(globalThis, '__daRestoreSyncSet')()
    })
  }
}

test('popup shows a failed options upgrade and Retry recovers', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  const [sw] = context.serviceWorkers()
  const restoreSyncWrites = await failSyncWrites(sw)
  await da.storage.clear()
  await expect(da.runtime.runUpgrade()).rejects.toThrow(
    /Failed to upgrade options/
  )

  const popup = await Popup.open(page, extensionId)
  await expect(popup.optionsUpgrade.failed()).toBeVisible()
  await expect(popup.optionsUpgrade.retryButton()).toBeEnabled()

  await restoreSyncWrites()
  await popup.optionsUpgrade.retryButton().click()

  await popup.optionsUpgrade.expectUpgraded()
  const options = await da.extensionOptions.get()
  expect(options.enabled).toBe(true)
})
