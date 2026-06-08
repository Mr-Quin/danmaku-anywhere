import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Per-item delete on the DanmakuTree (/mount) via the context menu:
 *   - Season delete cascades to its episodes — row vanishes, DB cleared.
 *   - Episode delete removes one row — parent + sibling stay intact.
 *
 * Both paths route through the shared confirm Dialog (`popup.dialog`).
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

function makeEpisode(
  seasonId: number,
  cid: number,
  episodeNumber: string
): EpisodeInsert {
  return {
    provider: DanmakuSourceType.Bilibili,
    providerIds: { cid, aid: 100000 + cid, bvid: `BV${cid}` },
    indexedId: String(cid),
    title: `Ep${episodeNumber}`,
    episodeNumber,
    seasonId,
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    lastChecked: 0,
  }
}

test('mount tree: delete season removes it + cascades episodes', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  const ep = await da.episode.add(makeEpisode(season.id, 1300001, '1'))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  await popup.mount.openItemMenu(seasonItem, 'delete')
  await popup.dialog.confirm()

  await expect(seasonItem).toBeHidden()

  await expect.poll(() => da.season.get(season.id)).toBeUndefined()
  await expect.poll(() => da.episode.get(ep.id)).toBeUndefined()
})

test('mount tree: delete single episode keeps season + siblings', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  const ep1 = await da.episode.add(makeEpisode(season.id, 1300001, '1'))
  const ep2 = await da.episode.add(makeEpisode(season.id, 1300002, '2'))

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  const ep1Item = popup.mount.episodeItem(ep1.id)
  await expect(ep1Item).toBeVisible()

  await popup.mount.openItemMenu(ep1Item, 'delete')
  await popup.dialog.confirm()

  await expect(ep1Item).toBeHidden()

  await expect.poll(() => da.episode.get(ep1.id)).toBeUndefined()

  // Sibling + parent intact — checked in both UI and DB so a wider-than-
  // intended delete (or one that updates only one layer) is caught.
  await expect(popup.mount.episodeItem(ep2.id)).toBeVisible()
  await expect(popup.mount.seasonItem(season.id)).toBeVisible()
  const survivor = await da.episode.get(ep2.id)
  expect(survivor?.id).toBe(ep2.id)
  const survivingSeason = await da.season.get(season.id)
  expect(survivingSeason?.id).toBe(season.id)
})
