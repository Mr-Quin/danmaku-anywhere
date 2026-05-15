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
 * Multi-select bulk delete from the DanmakuTree (/mount). Seeds a season
 * with three episodes, toggles multi-select via the toolbar chip, uses
 * the toolbar's "select all" checkbox to mark every visible episode,
 * then clicks the bottom-bar Delete and confirms the dialog. Asserts
 * all three episode rows are gone from the DB. The parent season has
 * no remaining episodes, so the parent tree row disappears too — this
 * doubles as coverage that bulk delete fires once for the whole batch.
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

test('mount tree: multi-select bulk delete removes every selected episode', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  const seeded = await Promise.all([
    da.episode.add(makeEpisode(season.id, 1300001, '1')),
    da.episode.add(makeEpisode(season.id, 1300002, '2')),
    da.episode.add(makeEpisode(season.id, 1300003, '3')),
  ])

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  // Episodes must be in the DOM before "select all" — selectAll() walks
  // the rendered tree and picks every `kind === 'episode'` node.
  for (const ep of seeded) {
    await expect(popup.mount.episodeItem(ep.id)).toBeVisible({
      timeout: 10_000,
    })
  }

  await popup.mount.enterMultiSelect()
  await popup.mount.selectAll()
  await popup.mount.bulkDelete()
  await popup.mount.confirmDialog()

  for (const ep of seeded) {
    await expect(popup.mount.episodeItem(ep.id)).toBeHidden({
      timeout: 10_000,
    })
    await expect
      .poll(() => da.episode.get(ep.id), { timeout: 10_000 })
      .toBeUndefined()
  }
})
