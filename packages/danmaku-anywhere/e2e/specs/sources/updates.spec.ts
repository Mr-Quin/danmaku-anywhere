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
 * Update detection on the Sources page. The store holds bilibili at its real
 * version while the catalog advertises a newer one, so the installed source
 * surfaces in the Updates available section as vOld -> vNew. Clicking Update
 * applies it: the stored manifest is replaced with the catalog version and the
 * row clears.
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
