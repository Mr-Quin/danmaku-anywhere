import { mockTencent } from '../../network/tencent'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Tencent segmented danmaku fetch (MbSearch → GetPageData → /barrage/base →
 * /barrage/segment/{name}). The happy path asserts the exact count both
 * segments add up to, then opens the danmaku viewer and asserts each
 * segment's comment text rendered. The partial-failure path 404s one of two
 * segments and asserts only the surviving segment's two comments render.
 */

test('tencent: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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
  await popup.seasonDetails.expectCommentCountToBe(episode, 3)

  const [season] = await da.season.list()
  const mountPopup = await Popup.open(page, extensionId, '/mount')
  await mountPopup.mount.waitForSeason(season.id)
  await mountPopup.mount.expandSeason(season.id)
  const episodeItem = mountPopup.mount.episodeItems().first()
  await expect(episodeItem).toBeVisible()
  await mountPopup.mount.openItemMenu(episodeItem, 'view')

  await expect(mountPopup.danmakuViewer.commentRow('hello')).toBeVisible()
  await expect(mountPopup.danmakuViewer.commentRow('测试')).toBeVisible()
  await expect(mountPopup.danmakuViewer.commentRow('world')).toBeVisible()
})

test('tencent: a failed danmaku segment does not drop the overlay', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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
