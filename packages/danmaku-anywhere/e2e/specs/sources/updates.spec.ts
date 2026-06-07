import {
  manifestStoreSeed,
  manifestVersion,
  mockCatalog,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Update flow on the Sources page. For an installed source, a stored manifest
 * behind the catalog surfaces in the Updates available section as vOld -> vNew
 * and Update applies it. For an uninstalled (catalog-only) source, the newer
 * version is not prompted as an update: a Refresh applies it in place so the
 * Catalog row shows the latest, ready to import.
 */

type StoredManifests = Record<string, { manifest: { version: string } }>

const BUMPED = '9.9.9'

test('updates: a stale installed source surfaces and applying it clears the row', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  const current = manifestVersion('bilibili')

  await applyProfile(context, da, {
    providers: { bilibili: {} },
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed() },
    ],
    network: [mockCatalog(undefined, { bilibili: BUMPED })],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeVisible()

  await popup.providers.update()

  await expect(page.getByText(`v${current} → v${BUMPED}`)).toBeHidden()

  const stored = (await da.storage.get('local', 'manifests')) as StoredManifests
  expect(stored.bilibili.manifest.version).toBe(BUMPED)
})

test('updates: an uninstalled catalog source updates in place on refresh, not as a prompt', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  // iqiyi is not a built-in, so it never gets a config: a catalog-only source.
  const ids = ['dandanplay', 'bilibili', 'tencent', 'iqiyi']

  // Built-ins disabled so no login probe fires; iqiyi stays the only catalog row.
  await applyProfile(context, da, {
    providers: {},
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed({}, ids) },
    ],
    network: [mockCatalog(ids, { iqiyi: BUMPED })],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  // Seeded stale with no runner yet, so it only surfaces once the refresh
  // applies its update in place.
  await expect(popup.providers.importButton('iQIYI')).toBeHidden()
  await expect(page.getByText(/Updates available|有可用更新/)).toBeHidden()

  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow('iQIYI')).toContainText(`v${BUMPED}`)
  await expect(popup.providers.importButton('iQIYI')).toBeVisible()
  await expect(page.getByText(/Updates available|有可用更新/)).toBeHidden()

  const stored = (await da.storage.get('local', 'manifests')) as StoredManifests
  expect(stored.iqiyi.manifest.version).toBe(BUMPED)
})
