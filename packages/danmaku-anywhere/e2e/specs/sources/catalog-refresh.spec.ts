import {
  type CatalogRequest,
  manifestStoreSeed,
  manifestVersion,
  recordingCatalog,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Refresh and Apply on the Sources page. Each drives its button, asserts the
 * user-visible result (the bumped version shows / the update row clears), that
 * the request carried the backend's bypass header, and that the index was
 * fetched once rather than once per sync step. Two things are deliberately not
 * claimed here: the browser-side `cache: 'reload'` is invisible to route
 * interception (ManifestRegistry.test.ts asserts it), and the route mock answers
 * regardless of cache state, so nothing here proves a server bypass
 * (cache.test.ts covers caches.default, manifest/router.test.ts the Cloudflare
 * subrequest cache).
 */

const BUMPED = '9.9.9'
const BUILT_IN_IDS = ['dandanplay', 'bilibili', 'tencent']

function forced(requests: CatalogRequest[]): CatalogRequest[] {
  return requests.filter((request) => request.cacheControl === 'no-cache')
}

test('refresh: a user refresh bypasses both caches and fetches the index once', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const ids = [...BUILT_IN_IDS, 'iqiyi']
  const requests: CatalogRequest[] = []

  await applyProfile(context, da, {
    providers: {},
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed({}, ids) },
    ],
    network: [recordingCatalog(ids, { iqiyi: BUMPED }, requests)],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow(/iQIYI|爱奇艺/)).toContainText(
    `v${BUMPED}`
  )

  // Only a user refresh forces, so filtering on the header isolates it from the
  // boot sync that may also have run.
  const forcedRequests = forced(requests)
  const forcedIndex = forcedRequests.filter((request) => !request.isFile)
  const forcedFiles = forcedRequests.filter((request) => request.isFile)

  expect(forcedIndex).toHaveLength(1)
  expect(forcedFiles.length).toBeGreaterThan(0)
})

test('apply: updating an installed source bypasses both caches', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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

  const forcedFiles = forced(requests).filter((request) => request.isFile)

  expect(forcedFiles.length).toBeGreaterThan(0)
})
