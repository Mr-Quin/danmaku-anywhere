import {
  type CommentEntity,
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Deleting a provider config keeps its seasons/episodes instead of cascading.
 * Seeds a Bilibili season with a cached episode, deletes the Bilibili provider
 * from /providers, then asserts on /mount that the season survives in the DB
 * and tree, still renders its cached comment count, shows a "source removed"
 * badge, and that Refresh Metadata is disabled.
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
    // The providers list probes Bilibili login status (/nav) on render.
    network: [
      {
        pattern: /api\.bilibili\.com\/x\/web-interface\/nav/,
        respond: (route) =>
          route.fulfill({ json: { code: 0, data: { isLogin: false } } }),
      },
    ],
  })

  const season = await da.season.add(SEASON)
  const ep = await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.deleteProvider('Bilibili')
  await popup.dialog.confirm()
  await popup.toast.expectSuccess(/Provider deleted|弹幕源已删除/)

  expect((await da.season.get(season.id))?.id).toBe(season.id)
  expect((await da.episode.get(ep.id))?.commentCount).toBe(COMMENTS.length)

  await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()

  await popup.mount.expandSeason(season.id)
  await expect(popup.mount.episodeCommentCount(ep.id)).toHaveText(
    String(COMMENTS.length)
  )

  await popup.mount.openContextMenu(seasonItem)
  const refresh = popup.mount.contextMenuItem('refresh')
  await expect(refresh).toBeVisible()
  await expect(refresh).toBeDisabled()
})
