import { mockTencent } from '../../network/tencent'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Tencent segmented danmaku fetch (MbSearch → GetPageData → /barrage/base →
 * /barrage/segment/{name}). The happy path confirms a full multi-segment fetch
 * renders a comment count. The partial-failure path 404s one of two segments
 * and asserts the surviving segment's comments still render, so one missing
 * segment doesn't drop the whole overlay.
 */

test('tencent: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { tencent: { enabled: true } },
    network: mockTencent({
      search: loadJsonFixture('tencent-search.json'),
      episodes: loadJsonFixture('tencent-episodes.json'),
      danmakuBase: loadJsonFixture('tencent-danmaku-base.json'),
      danmakuSegments: {
        '0': loadJsonFixture('tencent-danmaku-segment-0.json'),
        '30000': loadJsonFixture('tencent-danmaku-segment-30000.json'),
      },
    }),
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('Tencent')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('Tencent')
  await popup.seasonDetails.expectCommentCount(episode)
})

test('tencent: a failed danmaku segment does not drop the overlay', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { tencent: { enabled: true } },
    network: mockTencent({
      search: loadJsonFixture('tencent-search.json'),
      episodes: loadJsonFixture('tencent-episodes.json'),
      danmakuBase: loadJsonFixture('tencent-danmaku-base.json'),
      danmakuSegments: {
        // Segment 30000 is omitted: the mock 404s it, so one forEach
        // iteration fails while the other yields segment 0's two comments.
        '0': loadJsonFixture('tencent-danmaku-segment-0.json'),
      },
    }),
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('Tencent')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('Tencent')
  await popup.seasonDetails.expectCommentCountToBe(episode, 2)
})
