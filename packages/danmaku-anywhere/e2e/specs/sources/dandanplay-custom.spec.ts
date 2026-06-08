import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockDandanplayCustom } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * A custom DanDanPlay server: a dandanplay provider config pointed at
 * an arbitrary baseUrl with no built-ins enabled. Confirms the request hits
 * the custom host directly (not the proxy) and renders under the canonical
 * DanDanPlay testid.
 */

const CUSTOM_BASE_URL = 'https://compat.example.invalid'

const customConfig: ProviderConfig = {
  id: 'custom-ddp-1',
  manifestId: 'dandanplay',
  name: 'CustomDdp',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  configValues: {
    baseUrl: CUSTOM_BASE_URL,
    auth: { enabled: false, headers: [] },
  },
}

test('dandanplay: custom baseUrl flow', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    customProviders: [customConfig],
    network: mockDandanplayCustom({
      baseUrl: CUSTOM_BASE_URL,
      search: loadJsonFixture('ddp-compat-search.json'),
      bangumi: loadJsonFixture('ddp-compat-bangumi.json'),
      comments: loadJsonFixture('ddp-compat-comments.json'),
    }),
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('DanDanPlay')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('DanDanPlay')
  await popup.seasonDetails.expectCommentCount(episode)
})
