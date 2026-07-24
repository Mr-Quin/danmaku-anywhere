import {
  manifestVersion,
  mockCatalog,
  offlineCatalog,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * First-boot offline fallback: the manifest catalog proxy is unreachable
 * (index and file endpoints both fail) on a fresh profile with an empty
 * manifest store. ManifestRegistry seeds its bundled dango manifests instead
 * of leaving the registry empty, so the built-in sources still appear in the
 * Providers page catalog with no successful network round trip, and the
 * catalog is reported as never having been checked. Once the proxy recovers,
 * the next reachable sync auto-replaces a bundle-seeded manifest with the
 * catalog copy with no manual apply, since the tag on it (not surfaced as a
 * pending update) exists only to mark it as not user-chosen.
 */

const BUMPED = '9.9.9'

test.use({
  catalogMock: offlineCatalog(),
  // Boot's syncCatalog() and the Providers page's pending-updates query each
  // hit the unreachable index and log their own failure; same pair allowed in
  // e2e/specs/sources/update-recovery.spec.ts.
  expectedConsoleErrors: [
    'Failed to fetch manifest catalog',
    'Error in RPC handler',
  ],
})

test('built-in sources load from the bundled catalog when the proxy is unreachable on first boot', async ({
  page,
  extensionId,
  da,
}) => {
  // The offline index retries once with a 1s delay before falling back to
  // the bundle, so the manifest store fills in well after the popup would
  // otherwise mount and query an empty registry once with no later refetch.
  // Wait for the store directly (the RPC's ground truth) before opening the
  // popup so the page's first query already sees the seeded catalog.
  await expect
    .poll(
      async () => {
        const stored = (await da.storage.get('local', 'manifests')) as Record<
          string,
          unknown
        >
        return Object.keys(stored ?? {}).length
      },
      { timeout: 10_000 }
    )
    .toBeGreaterThan(0)

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(popup.providers.checkedNeverLabel()).toBeVisible()

  for (const name of [
    /DanDanPlay|弹弹play/,
    /Bilibili|B站/,
    /Tencent Video|腾讯视频/,
  ]) {
    await expect(popup.providers.importButton(name)).toBeVisible()
  }
})

test('a bundle-seeded source auto-upgrades to the catalog copy on the next reachable sync, no manual apply', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const iqiyiName = /iQIYI|爱奇艺/
  const bundledVersion = manifestVersion('iqiyi')

  await expect
    .poll(
      async () => {
        const stored = (await da.storage.get('local', 'manifests')) as Record<
          string,
          { kind: string }
        >
        return stored?.iqiyi?.kind
      },
      { timeout: 10_000 }
    )
    .toBe('bundled')

  // The first reachable sync after an offline boot also runs the deferred
  // default-provider seed (unseeded because the offline boot never reached
  // it), auto-importing dandanplay/bilibili/tencent as provider configs and
  // triggering their login probes. Orthogonal to the bundle auto-upgrade
  // under test here, so mark seeding done up front to keep this test scoped
  // to the manifest catalog.
  await da.providerConfig.markSeeded()

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.catalogRow(iqiyiName)).toContainText(
    `v${bundledVersion}`
  )

  // The proxy recovers: shadow the offline mock with a working one that
  // advertises a newer iQIYI, same as a normal catalog update.
  const recovered = mockCatalog(
    ['dandanplay', 'bilibili', 'tencent', 'iqiyi'],
    { iqiyi: BUMPED }
  )
  await context.route(recovered.pattern, recovered.respond)

  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow(iqiyiName)).toContainText(
    `v${BUMPED}`
  )
  await expect(popup.providers.checkedNeverLabel()).toBeHidden()

  const stored = (await da.storage.get('local', 'manifests')) as Record<
    string,
    { kind: string; manifest: { version: string } }
  >
  expect(stored.iqiyi.kind).toBe('preinstalled')
  expect(stored.iqiyi.manifest.version).toBe(BUMPED)
})
