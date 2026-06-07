import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { Language } from '../../../src/common/localization/language'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockCatalog } from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Manifest display strings localize into the active UI language. With the
 * extension set to Chinese, the catalog lists an uninstalled manifest under its
 * localized name (iQIYI -> 爱奇艺) and the generic config editor renders a
 * dandanplay field under its localized title (Base URL -> 基础地址).
 */

const BILIBILI_NAV = /api\.bilibili\.com\/x\/web-interface\/nav/
const TENCENT_PROBE =
  /pbaccess\.video\.qq\.com\/.*page_server_rpc\.PageServer\/GetPageData/

const localDdp: ProviderConfig = {
  id: 'localized-ddp',
  manifestId: 'dandanplay',
  name: 'My DDP',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  configValues: {
    baseUrl: '',
    auth: { enabled: false, headers: [] },
  },
}

test('catalog and config editor render localized manifest strings', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.zh },
    customProviders: [localDdp],
    network: [
      mockCatalog(['dandanplay', 'bilibili', 'tencent', 'iqiyi']),
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

  await popup.providers.refreshCatalog()
  await expect(popup.providers.row('爱奇艺')).toBeVisible()

  await popup.providers.edit('My DDP')
  await popup.providers.expectFieldVisible('基础地址')
})
