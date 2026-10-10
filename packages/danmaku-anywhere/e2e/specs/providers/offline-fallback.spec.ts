import type { BrowserContext } from '@playwright/test'
import {
  manifestVersion,
  mockCatalog,
  offlineCatalog,
} from '../../network/catalog'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * First-boot offline fallback: the manifest catalog proxy is unreachable
 * (index and file endpoints both fail) on a fresh profile with an empty
 * manifest store. ManifestRegistry seeds its bundled dango manifests and the
 * boot sync still seeds the default provider configs from them, so the
 * built-in sources land installed and usable with no successful network round
 * trip, and the catalog is reported as never having been checked. Once the
 * proxy recovers, the next reachable sync auto-replaces a bundle-seeded
 * manifest with the catalog copy with no manual apply, and does not re-seed
 * the configs on top of the offline ones.
 */

const BUMPED = '9.9.9'

const BUILT_IN_NAMES = [
  /DanDanPlay|弹弹play/,
  /Bilibili|B站/,
  /Tencent Video|腾讯视频/,
]

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

// applyProfile is off limits here: it clears storage, which would wipe the
// bundle-seeded manifests and configs this spec is about. Route the probes the
// seeded sources fire on render directly instead.
async function routeLoginProbes(context: BrowserContext): Promise<void> {
  for (const mock of mockLoginProbes()) {
    await context.route(mock.pattern, mock.respond)
  }
}

test('built-in sources are installed from the bundled catalog when the proxy is unreachable on first boot', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await routeLoginProbes(context)

  // The offline index retries once with a 1s delay before falling back to the
  // bundle, so the seed lands well after the popup would otherwise mount and
  // query an empty list once with no later refetch. Wait for the configs (the
  // seed's ground truth) before opening the popup.
  await expect
    .poll(
      async () => {
        const configs = await da.providerConfig.list()
        return configs.map((config) => config.manifestId).sort()
      },
      { timeout: 10_000 }
    )
    .toEqual(['bilibili', 'dandanplay', 'tencent'])

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
  await expect(popup.providers.installedHeading(3)).toBeVisible()

  for (const name of BUILT_IN_NAMES) {
    await expect(popup.providers.row(name).first()).toBeVisible()
    await expect(popup.providers.importButton(name)).toBeHidden()
  }

  const configs = await da.providerConfig.list()
  expect(configs.every((config) => config.enabled)).toBe(true)
})

test('a bundle-seeded source auto-upgrades to the catalog copy on the next reachable sync, no manual apply', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await routeLoginProbes(context)

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
  await expect(popup.providers.installedHeading(3)).toBeVisible()

  const stored = (await da.storage.get('local', 'manifests')) as Record<
    string,
    { kind: string; manifest: { version: string } }
  >
  expect(stored.iqiyi.kind).toBe('preinstalled')
  expect(stored.iqiyi.manifest.version).toBe(BUMPED)
})
