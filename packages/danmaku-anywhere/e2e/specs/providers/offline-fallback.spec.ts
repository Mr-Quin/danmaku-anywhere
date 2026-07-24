import { offlineCatalog } from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * First-boot offline fallback: the manifest catalog proxy is unreachable
 * (index and file endpoints both fail) on a fresh profile with an empty
 * manifest store. ManifestRegistry seeds its bundled dango manifests instead
 * of leaving the registry empty, so the built-in sources still appear in the
 * Providers page catalog with no successful network round trip, and the
 * catalog is reported as never having been checked.
 */

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
