import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockDandanplayCustom } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * A DanDanPlay-compatible server on a loopback host. The engine blocks private
 * and loopback hosts by default, so search and danmaku only resolve because the
 * host threads the private-host opt-in into every manifest run. Confirms results
 * render and the comment count shows for a config pointed at http://localhost.
 */

const LOCAL_BASE_URL = 'http://localhost:7766'

const localConfig: ProviderConfig = {
  id: 'local-ddp-1',
  manifestId: 'dandanplay',
  name: 'LocalDdp',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  configValues: {
    baseUrl: LOCAL_BASE_URL,
    auth: { enabled: false, headers: [] },
  },
}

test('dandanplay: loopback baseUrl resolves with the private-host opt-in', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    customProviders: [localConfig],
    network: mockDandanplayCustom({
      baseUrl: LOCAL_BASE_URL,
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
