import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Per-item delete on the DanmakuTree (/mount). Two paths:
 *   - Season delete via the season's context menu — cascades to its
 *     episodes; the season row disappears and `da.season.get` returns
 *     undefined.
 *   - Episode delete via the episode's context menu — removes a single
 *     row, leaving the parent season intact (still has another episode).
 *
 * Both delete actions open a shared confirmation Dialog rendered in a
 * portal; the spec clicks `[data-testid="dialog-confirm"]` to commit.
 */

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'builtin:bilibili',
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
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  const ep = await da.episode.add(makeEpisode(season.id, 1300001, '1'))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  await popup.mount.openItemMenu(seasonItem, 'delete')
  await popup.mount.confirmDialog()

  await expect(seasonItem).toBeHidden({ timeout: 10_000 })

  await expect
    .poll(() => da.season.get(season.id), { timeout: 10_000 })
    .toBeUndefined()
  await expect
    .poll(() => da.episode.get(ep.id), { timeout: 10_000 })
    .toBeUndefined()
})

test('mount tree: delete single episode keeps season + siblings', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
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
  await expect(ep1Item).toBeVisible({ timeout: 10_000 })

  await popup.mount.openItemMenu(ep1Item, 'delete')
  await popup.mount.confirmDialog()

  await expect(ep1Item).toBeHidden({ timeout: 10_000 })

  await expect
    .poll(() => da.episode.get(ep1.id), { timeout: 10_000 })
    .toBeUndefined()

  // Sibling + parent intact — checked in both UI and DB so a regression
  // that wipes more than intended (or only updates one layer) is caught.
  await expect(popup.mount.episodeItem(ep2.id)).toBeVisible()
  await expect(popup.mount.seasonItem(season.id)).toBeVisible()
  const survivor = await da.episode.get(ep2.id)
  expect(survivor?.id).toBe(ep2.id)
  const survivingSeason = await da.season.get(season.id)
  expect(survivingSeason?.id).toBe(season.id)
})
