import {
  manifestStoreSeed,
  manifestVersion,
  mockCatalog,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Failure recovery on the providers page. An update whose manifest file fails
 * to download shows the in-flight "Updating" state, then marks the row as
 * failed with a Retry action; once the outage clears, Retry applies the
 * update. A catalog refresh against an unreachable index (after its single
 * retry) surfaces an error toast instead of silently keeping the stale list.
 */

type StoredManifests = Record<string, { manifest: { version: string } }>

const BUMPED = '9.9.9'

test.use({
  // The outage paths under test log from the SW before the popup surfaces
  // them as toasts: per-file fetch failure, index failure after its retry,
  // and the RPC handler relaying the rejection to the popup. These must be
  // strings: Playwright reads a multi-RegExp array as a [value, options]
  // fixture tuple (typeof RegExp is 'object') and drops every pattern but
  // the first.
  expectedConsoleErrors: [
    'Failed to fetch catalog manifest',
    'Failed to fetch manifest catalog',
    'Error in RPC handler',
  ],
})

test('a failed update marks the row and Retry applies it once the outage clears', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const current = manifestVersion('bilibili')

  await applyProfile(context, da, {
    providers: { bilibili: {} },
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed() },
    ],
    network: [mockCatalog(undefined, { bilibili: BUMPED })],
  })

  // Registered after applyProfile so it shadows the catalog mock's file
  // route. Holding the response open keeps the in-flight state assertable.
  let outage = true
  let releaseFile!: () => void
  const fileHeld = new Promise<void>((resolve) => {
    releaseFile = resolve
  })
  await context.route(/\/manifest\/file/, async (route) => {
    if (!outage) {
      return route.fallback()
    }
    await fileHeld
    await route.fulfill({ status: 500, body: 'unavailable' })
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeVisible()

  await popup.providers.update()
  await expect(popup.providers.updatingButton()).toBeVisible()
  releaseFile()

  await popup.toast.expectError(/Failed to apply updates/)
  await expect(popup.providers.updateFailedLabel()).toBeVisible()
  await expect(popup.providers.retryButton()).toBeVisible()

  outage = false
  await popup.providers.retryButton().click()

  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeHidden()
  const stored = (await da.storage.get('local', 'manifests')) as StoredManifests
  expect(stored.bilibili.manifest.version).toBe(BUMPED)
})

test('a catalog refresh against an unreachable index surfaces an error toast', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: {} },
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed() },
    ],
    network: [mockCatalog()],
  })

  // Registered after applyProfile so it shadows the catalog mock's index.
  await context.route(/\/manifest(\?|$)/, (route) =>
    route.fulfill({ status: 503, body: 'unavailable' })
  )

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()

  await popup.providers.refreshCatalog()

  await popup.toast.expectError(/Failed to fetch the manifest catalog/, {
    timeout: 10_000,
  })
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
})
