import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockDandanplayCompat } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

const COMPAT_BASE_URL = 'https://compat.example.invalid'

const compatConfig: ProviderConfig = {
  id: 'compat-test-1',
  type: 'DanDanPlayCompatible',
  name: 'CompatTest',
  // The compat provider routes through the DanDanPlay implementation, so
  // its rendered cards use season-card-DanDanPlay-* testids.
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  options: {
    baseUrl: COMPAT_BASE_URL,
    auth: { enabled: false, headers: [] },
  },
}

test('dandanplay-compat: custom baseUrl flow', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    customProviders: [compatConfig],
    network: mockDandanplayCompat({
      baseUrl: COMPAT_BASE_URL,
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
