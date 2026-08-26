import {
  type CatalogRequest,
  manifestStoreSeed,
  manifestVersion,
  recordingCatalog,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * User-initiated catalog actions must bypass the backend edge cache. Refresh
 * and Apply both drive their button, assert the user-visible signal (the bumped
 * version appears / the update row clears), and assert the catalog requests
 * they triggered carried Cache-Control: no-cache so the backend refetches the
 * latest manifests instead of serving up to an hour of stale edge cache.
 */

const BUMPED = '9.9.9'
const BUILT_IN_IDS = ['dandanplay', 'bilibili', 'tencent']

test('refresh: a user refresh forces a no-cache catalog fetch', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  const ids = ['dandanplay', 'bilibili', 'tencent', 'iqiyi']
  const requests: CatalogRequest[] = []

  await applyProfile(context, da, {
    providers: {},
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed({}, ids) },
    ],
    network: [recordingCatalog(ids, { iqiyi: BUMPED }, requests)],
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  const iqiyiName = /iQIYI|爱奇艺/

  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow(iqiyiName)).toContainText(
    `v${BUMPED}`
  )

  // Only the user refresh forces no-cache (background syncs stay cached), so
  // the forced requests isolate the refresh regardless of any boot sync. The
  // index is fetched once and shared, not once per sync step.
  const forced = requests.filter((r) => r.cacheControl === 'no-cache')
  expect(forced.filter((r) => !r.isFile)).toHaveLength(1)
  expect(forced.some((r) => r.isFile)).toBe(true)
})

test('apply: updating an installed source forces a no-cache fetch', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  const current = manifestVersion('bilibili')
  const requests: CatalogRequest[] = []

  await applyProfile(context, da, {
    providers: { bilibili: {} },
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed() },
    ],
    network: [recordingCatalog(BUILT_IN_IDS, { bilibili: BUMPED }, requests)],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeVisible()

  await popup.providers.update()

  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeHidden()

  // The applied manifest file must come from a forced fetch, not the edge cache.
  const forcedFiles = requests.filter(
    (r) => r.isFile && r.cacheControl === 'no-cache'
  )
  expect(forcedFiles.length).toBeGreaterThan(0)
})
