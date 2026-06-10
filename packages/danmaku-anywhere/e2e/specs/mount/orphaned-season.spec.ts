import {
  type CommentEntity,
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Deleting a provider config orphans its seasons instead of cascading.
 * Seeds a bookmarked Bilibili season with a cached episode, deletes the
 * Bilibili provider, then asserts the season/episode survive (DB + tree),
 * cached comments still render, the bookmark and its stubs are gone, a
 * "source removed" badge shows, Refresh Metadata is disabled, Follow is
 * disabled, and the episode menu no longer offers Refresh Danmaku.
 */

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'bilibili',
  indexedId: '41410',
  title: '葬送的芙莉莲',
  type: '番剧',
  imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

const COMMENTS: CommentEntity[] = [
  { p: '1,1,16777215', m: 'first' },
  { p: '2,1,16777215', m: 'second' },
  { p: '3,1,16777215', m: 'third' },
]

function makeEpisode(seasonId: number): EpisodeInsert {
  // indexedId matches the fixture's first episode so the bookmark dedups to
  // one stub.
  return {
    provider: DanmakuSourceType.Bilibili,
    providerIds: { cid: 1300001, aid: 100001, bvid: 'BV1aaaaaaaa' },
    indexedId: '1300001',
    title: 'Ep1',
    episodeNumber: '1',
    seasonId,
    comments: COMMENTS,
    commentCount: COMMENTS.length,
    schemaVersion: 4,
    lastChecked: 0,
  }
}

test('deleting a provider orphans its season but keeps it viewable', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const season = await da.season.add(SEASON)
  const ep = await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  let seasonItem = await popup.mount.waitForSeason(season.id)
  await popup.mount.openItemMenu(seasonItem, 'bookmarkAdd')
  await expect(seasonItem).toContainText(/\+1/)

  await Popup.open(page, extensionId, '/providers')
  await popup.providers.deleteProvider('Bilibili')
  await popup.dialog.confirm()
  await popup.toast.expectSuccess(/Provider deleted|弹幕源已删除/)

  expect((await da.season.get(season.id))?.id).toBe(season.id)
  expect((await da.episode.get(ep.id))?.commentCount).toBe(COMMENTS.length)
  await expect.poll(() => da.bookmark.bySeason(season.id)).toBeUndefined()

  await Popup.open(page, extensionId, '/mount')
  seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()
  await expect(seasonItem).not.toContainText(/\+\d+/)

  await popup.mount.expandSeason(season.id)
  await expect(popup.mount.episodeCommentCount(ep.id)).toHaveText(
    String(COMMENTS.length)
  )

  const epItem = popup.mount.episodeItem(ep.id)
  await popup.mount.openContextMenu(epItem)
  await expect(popup.mount.contextMenuItem('view')).toBeVisible()
  await expect(popup.mount.contextMenuItem('refresh')).toBeHidden()

  await popup.mount.openContextMenu(seasonItem)
  const refresh = popup.mount.contextMenuItem('refresh')
  await expect(refresh).toBeVisible()
  await expect(refresh).toBeDisabled()
  await expect(popup.mount.contextMenuItem('bookmarkAdd')).toBeDisabled()
})
