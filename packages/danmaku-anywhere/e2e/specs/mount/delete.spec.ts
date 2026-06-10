import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Per-item delete on the DanmakuTree (/mount) via the context menu:
 *   - Season delete cascades to its episodes: row vanishes, DB cleared.
 *   - Episode delete removes one row: parent + sibling stay intact.
 *
 * Both paths route through the shared confirm Dialog (`popup.dialog`).
 */

test('mount tree: delete season removes it + cascades episodes', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(makeBilibiliSeason())
  const ep = await da.episode.add(
    makeBilibiliEpisode(season.id, { cid: 1300001, episodeNumber: '1' })
  )

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

  const season = await da.season.add(makeBilibiliSeason())
  const ep1 = await da.episode.add(
    makeBilibiliEpisode(season.id, { cid: 1300001, episodeNumber: '1' })
  )
  const ep2 = await da.episode.add(
    makeBilibiliEpisode(season.id, { cid: 1300002, episodeNumber: '2' })
  )

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  const ep1Item = popup.mount.episodeItem(ep1.id)
  await expect(ep1Item).toBeVisible()

  await popup.mount.openItemMenu(ep1Item, 'delete')
  await popup.dialog.confirm()

  await expect(ep1Item).toBeHidden()

  await expect.poll(() => da.episode.get(ep1.id)).toBeUndefined()

  // Sibling + parent intact, checked in both UI and DB so a wider-than-
  // intended delete (or one that updates only one layer) is caught.
  await expect(popup.mount.episodeItem(ep2.id)).toBeVisible()
  await expect(popup.mount.seasonItem(season.id)).toBeVisible()
  const survivor = await da.episode.get(ep2.id)
  expect(survivor?.id).toBe(ep2.id)
  const survivingSeason = await da.season.get(season.id)
  expect(survivingSeason?.id).toBe(season.id)
})
