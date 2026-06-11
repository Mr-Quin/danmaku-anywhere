import { Language } from '../../../src/common/localization/language'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockCatalog } from '../../network/catalog'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Manifest display strings localize into the active UI language. With the
 * extension set to Chinese, the catalog lists an uninstalled manifest under its
 * localized name (iQIYI -> 爱奇艺) and the generic config editor renders a
 * dandanplay field under its localized title (Base URL -> 基础地址).
 */

const localDdp: ProviderConfig = {
  id: 'localized-ddp',
  manifestId: 'dandanplay',
  name: 'My DDP',
  enabled: true,
  configValues: {
    baseUrl: '',
    auth: { enabled: false, headers: [] },
  },
}

test('catalog and config editor render localized manifest strings', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.zh },
    customProviders: [localDdp],
    network: [
      mockCatalog(['dandanplay', 'bilibili', 'tencent', 'iqiyi']),
      ...mockLoginProbes(),
    ],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.refreshCatalog()
  await expect(popup.providers.row('爱奇艺')).toBeVisible()

  await popup.providers.edit('My DDP')
  await popup.providers.expectFieldVisible('基础地址')
})
