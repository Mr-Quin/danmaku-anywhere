import type { BrowserContext } from '@playwright/test'
import { alarmKeys } from '../../../src/common/alarms/constants'
import {
  manifestVersion,
  mockCatalog,
  offlineCatalog,
} from '../../network/catalog'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * First-boot offline fallback: with the catalog proxy unreachable on a fresh
 * profile, the Sources page opened right away fills in the built-in sources
 * from the bundled manifests and reports the catalog as never checked. Once
 * the proxy recovers, a sync started from the page or by the background alarm
 * replaces a bundle-seeded manifest with the catalog copy, and the open page
 * shows it without being reopened.
 */

const BUMPED = '9.9.9'
const IQIYI_NAME = /iQIYI|爱奇艺/

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

// Alarms fire with no minimum delay for an unpacked extension.
async function fireCatalogSyncAlarm(context: BrowserContext): Promise<void> {
  const [serviceWorker] = context.serviceWorkers()
  await serviceWorker.evaluate((name) => {
    return chrome.alarms.create(name, { when: Date.now() })
  }, alarmKeys.REFRESH_MANIFESTS)
}

async function recoverCatalog(context: BrowserContext): Promise<void> {
  const recovered = mockCatalog({
    ids: ['dandanplay', 'bilibili', 'tencent', 'iqiyi'],
    versions: { iqiyi: BUMPED },
  })
  await context.route(recovered.pattern, recovered.respond)
}

test('built-in sources are installed from the bundled catalog when the proxy is unreachable on first boot', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await routeLoginProbes(context)

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
  await expect(popup.providers.installedHeading(3)).toBeVisible()

  for (const name of BUILT_IN_NAMES) {
    await expect(popup.providers.row(name).first()).toBeVisible()
    await expect(popup.providers.importButton(name)).toBeHidden()
  }

  const configs = await da.providerConfig.list()
  expect(configs.map((config) => config.manifestId).sort()).toEqual([
    'bilibili',
    'dandanplay',
    'tencent',
  ])
  expect(configs.every((config) => config.enabled)).toBe(true)
})

test('a bundle-seeded source auto-upgrades to the catalog copy on the next reachable sync, no manual apply', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await routeLoginProbes(context)

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.catalogRow(IQIYI_NAME)).toContainText(
    `v${manifestVersion('iqiyi')}`
  )
  const seeded = (await da.storage.get('local', 'manifests')) as Record<
    string,
    { kind: string }
  >
  expect(seeded.iqiyi.kind).toBe('bundled')

  await recoverCatalog(context)
  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow(IQIYI_NAME)).toContainText(
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

test('an open Sources page follows a background catalog sync once the proxy recovers', async ({
  context,
  page,
  extensionId,
}) => {
  await routeLoginProbes(context)

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
  await expect(popup.providers.catalogRow(IQIYI_NAME)).toContainText(
    `v${manifestVersion('iqiyi')}`
  )

  await recoverCatalog(context)
  await fireCatalogSyncAlarm(context)

  await expect(popup.providers.catalogRow(IQIYI_NAME)).toContainText(
    `v${BUMPED}`
  )
  await expect(popup.providers.checkedNeverLabel()).toBeHidden()
  await expect(popup.providers.installedHeading(3)).toBeVisible()
})
