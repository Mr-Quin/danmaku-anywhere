import type { Page } from '@playwright/test'
import { mockTencent } from '../../network/tencent'
import type { DanmakuViewerPage } from '../../pom/DanmakuViewerPage'
import { Popup } from '../../pom/Popup'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Tencent segmented danmaku fetch (MbSearch → GetPageData → /barrage/base →
 * /barrage/segment/{name}). Happy path asserts the exact count both segments
 * total and that each one's text renders in the danmaku viewer. Partial
 * failure 404s one of two segments and asserts only the survivor's comments
 * land. Malformed path serves a comment with no text and asserts it is
 * dropped while the well-formed ones persist.
 */

async function openDanmakuViewer(
  page: Page,
  extensionId: string,
  da: DaClient
): Promise<DanmakuViewerPage> {
  const [season] = await da.season.list()
  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)
  const episodeItem = popup.mount.episodeItems().first()
  await expect(episodeItem).toBeVisible()
  await popup.mount.openItemMenu(episodeItem, 'view')
  return popup.danmakuViewer
}

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

  const viewer = await openDanmakuViewer(page, extensionId, da)

  await expect(viewer.commentRow('hello')).toBeVisible()
  await expect(viewer.commentRow('测试')).toBeVisible()
  await expect(viewer.commentRow('world')).toBeVisible()
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

test('tencent: a malformed comment is dropped without losing the batch', async ({
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
        // The malformed segment's second entry has no `content`, so the
        // pipeline emits it without the `m` the comment schema requires.
        '0': loadJsonFixture('tencent-danmaku-segment-malformed.json'),
        '30000': loadJsonFixture('tencent-danmaku-segment-30000.json'),
      },
    }),
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('Tencent')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('Tencent')
  await popup.seasonDetails.expectCommentCountToBe(episode, 2)

  const viewer = await openDanmakuViewer(page, extensionId, da)

  await expect(viewer.commentRow('kept')).toBeVisible()
  await expect(viewer.commentRow('world')).toBeVisible()
  await expect(viewer.commentRows()).toHaveCount(2)
})
