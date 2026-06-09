import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Multi-select bulk delete on the DanmakuTree (/mount). Toggles multi-select,
 * selects all visible episodes, deletes via the bulk-delete action, confirms
 * the dialog. Asserts every row + DB record is gone. With no surviving
 * episodes the parent season row also disappears.
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

test('mount tree: multi-select bulk delete removes every selected episode', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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

  // Episodes must be rendered before selectAll — it walks the visible tree.
  for (const ep of seeded) {
    await expect(popup.mount.episodeItem(ep.id)).toBeVisible()
  }

  await popup.mount.enterMultiSelect()
  await popup.mount.selectAll()
  await popup.mount.bulkDelete()
  await popup.dialog.confirm()

  for (const ep of seeded) {
    await expect(popup.mount.episodeItem(ep.id)).toBeHidden()
    await expect.poll(() => da.episode.get(ep.id)).toBeUndefined()
  }
})
