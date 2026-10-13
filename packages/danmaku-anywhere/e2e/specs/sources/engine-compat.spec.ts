import {
  manifestStoreSeed,
  manifestVersion,
  mockCatalog,
  type StoredManifests,
} from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A catalog release whose manifests need a newer engine than the extension
 * bundles. After a Refresh, the installed source offers no update and the
 * catalog-only source keeps the version it has, in the Sources list and in
 * storage.
 */

const BUMPED = '9.9.9'
const FUTURE_ENGINE = '99.0.0'

test('a catalog update that needs a newer engine leaves the installed version in place', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const ids = ['dandanplay', 'bilibili', 'tencent', 'iqiyi']
  const iqiyiName = /iQIYI|爱奇艺/
  const bilibiliCurrent = manifestVersion('bilibili')
  const iqiyiCurrent = manifestVersion('iqiyi')

  await applyProfile(context, da, {
    providers: { bilibili: {} },
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed({}, ids) },
    ],
    network: [
      mockCatalog({
        ids,
        versions: { bilibili: BUMPED, iqiyi: BUMPED },
        minEngineVersions: { bilibili: FUTURE_ENGINE, iqiyi: FUTURE_ENGINE },
      }),
    ],
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()

  await popup.providers.refreshCatalog()

  await expect(popup.providers.checkedNeverLabel()).toBeHidden()
  await expect(popup.providers.catalogRow(iqiyiName)).toContainText(
    `v${iqiyiCurrent}`
  )
  await expect(page.getByText(/Updates available|有可用更新/)).toBeHidden()
  await expect(page.getByText(`v${BUMPED}`)).toBeHidden()

  const stored = (await da.storage.get('local', 'manifests')) as StoredManifests
  expect(stored.bilibili.manifest.version).toBe(bilibiliCurrent)
  expect(stored.iqiyi.manifest.version).toBe(iqiyiCurrent)
})
