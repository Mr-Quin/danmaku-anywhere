import { mockCatalog } from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Catalog browse + import on the Sources page. A manifest the registry knows
 * about but the user has no config for shows up in the Catalog section once a
 * Refresh pulls it from the (now richer) catalog. Import creates a config and
 * the source moves into Installed: success toast, the catalog row's Import
 * button is gone, the row appears in the installed list, and a config
 * referencing the manifest is persisted.
 */

const BILIBILI_NAV = /api\.bilibili\.com\/x\/web-interface\/nav/
const TENCENT_PROBE =
  /pbaccess\.video\.qq\.com\/.*page_server_rpc\.PageServer\/GetPageData/

const CATALOG_WITH_IQIYI = ['dandanplay', 'bilibili', 'tencent', 'iqiyi']

test('catalog: refresh surfaces an uninstalled source and import installs it', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {},
    network: [
      mockCatalog(CATALOG_WITH_IQIYI),
      {
        pattern: BILIBILI_NAV,
        respond: (route) =>
          route.fulfill({
            json: { code: 0, message: '0', data: { isLogin: true } },
          }),
      },
      {
        pattern: TENCENT_PROBE,
        respond: (route) =>
          route.fulfill({ json: { ret: 0, msg: '', data: {} } }),
      },
    ],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  // iQIYI isn't seeded at boot (the fixture catalog has only the built-ins),
  // so the richer catalog only reaches the registry once Refresh re-fetches.
  // The catalog name localizes with the UI language (iQIYI -> 爱奇艺).
  const iqiyiName = /iQIYI|爱奇艺/
  await expect(popup.providers.importButton(iqiyiName)).toBeHidden()
  await popup.providers.refreshCatalog()
  await expect(popup.providers.importButton(iqiyiName)).toBeVisible()

  await popup.providers.import(iqiyiName)

  await popup.toast.expectSuccess(/Provider created|创建/)
  await expect(popup.providers.importButton(iqiyiName)).toBeHidden()
  await expect(popup.providers.row(iqiyiName)).toBeVisible()

  const configs = await da.providerConfig.list()
  expect(configs.some((config) => config.manifestId === 'iqiyi')).toBe(true)
})
