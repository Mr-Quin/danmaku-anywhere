import {
  type CommentEntity,
  DanmakuSourceType,
  type EpisodeStub,
} from '@danmaku-anywhere/danmaku-converter'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Deleting a provider config orphans its seasons instead of cascading.
 * Seeds a bookmarked Bilibili season with a cached episode, deletes the
 * Bilibili provider, then asserts the season/episode survive (DB + tree),
 * cached comments still render, the bookmark and its stubs are gone, a
 * "source removed" badge shows, Refresh Metadata is disabled, Follow is
 * disabled, and the episode menu no longer offers Refresh Danmaku.
 */

const COMMENTS: CommentEntity[] = [
  { p: '1,1,16777215', m: 'first' },
  { p: '2,1,16777215', m: 'second' },
  { p: '3,1,16777215', m: 'third' },
]

const UNFETCHED_STUB: EpisodeStub = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { cid: 1300002, aid: 1400002, bvid: 'BV1300002' },
  indexedId: '1300002',
  title: 'Ep2',
  episodeNumber: '2',
}

test('deleting a provider orphans its season but keeps it viewable', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: [...mockLoginProbes()],
  })

  const season = await da.season.add(makeBilibiliSeason())
  const ep = await da.episode.add(
    makeBilibiliEpisode(season.id, { comments: COMMENTS })
  )
  await da.bookmark.add(season.id, [UNFETCHED_STUB])

  const popup = await Popup.open(page, extensionId, '/mount')
  let seasonItem = await popup.mount.waitForSeason(season.id)
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
