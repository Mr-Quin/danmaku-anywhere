import type { BrowserContext, Worker } from '@playwright/test'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Popup } from '../../pom/Popup'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * An options upgrade that cannot write to sync storage leaves the popup on a
 * failure screen with a Retry button, not a blank page, and once sync writes
 * work again Retry upgrades the stores and the popup opens its pages. A page
 * the controller mounts on shows a failure button in place of its floating
 * button meanwhile.
 */

test.use({
  expectedConsoleErrors: ['Failed to upgrade', 'Options upgrade failed'],
})

const HOST_ORIGIN = 'https://da-test.invalid'
const MOUNT_PATTERN = `${HOST_ORIGIN}/*`

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

// Puts one store a version behind, then runs the upgrade while sync writes
// fail, so it is recorded as failed with every other store left as it was.
async function failOptionsUpgrade(context: BrowserContext, da: DaClient) {
  const stored = await da.storage.get('sync', 'aiProviderConfig')
  await da.storage.setRaw('sync', 'aiProviderConfig', {
    ...(stored as object),
    version: 0,
  })
  const [sw] = context.serviceWorkers()
  const restoreSyncWrites = await failSyncWrites(sw)
  await expect(da.runtime.runUpgrade()).rejects.toThrow(
    /Failed to upgrade options: .*aiProviderConfig/
  )
  return restoreSyncWrites
}

test('popup shows a failed options upgrade and Retry recovers', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  const restoreSyncWrites = await failOptionsUpgrade(context, da)

  const popup = await Popup.open(page, extensionId)
  await expect(popup.optionsUpgrade.failed()).toBeVisible()
  await expect(popup.optionsUpgrade.retryButton()).toBeEnabled()

  await restoreSyncWrites()
  await popup.optionsUpgrade.retryButton().click()

  await popup.optionsUpgrade.expectUpgraded()
  expect(await da.storage.get('sync', 'aiProviderConfig')).toMatchObject({
    version: 1,
  })
})

test('a mounted page shows a failure button while the upgrade is failed', async ({
  context,
  page,
  da,
}) => {
  await applyProfile(context, da, {})
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    name: 'da-e2e-upgrade-failure',
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)
  await failOptionsUpgrade(context, da)

  await new IntegrationPage(page).open(
    `${HOST_ORIGIN}/upgrade-failure/`,
    'native-video.html'
  )

  await expect(page.getByTestId('options-upgrade-failed-button')).toBeVisible({
    timeout: 15_000,
  })
})
