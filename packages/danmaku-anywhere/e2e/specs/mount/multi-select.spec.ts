import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Multi-select bulk delete on the DanmakuTree (/mount). Toggles multi-select,
 * selects all visible episodes, deletes via the bulk-delete action, confirms
 * the dialog. Asserts every row + DB record is gone. With no surviving
 * episodes the parent season row also disappears.
 */

test('mount tree: multi-select bulk delete removes every selected episode', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(makeBilibiliSeason())
  const seeded = await Promise.all([
    da.episode.add(
      makeBilibiliEpisode(season.id, { cid: 1300001, episodeNumber: '1' })
    ),
    da.episode.add(
      makeBilibiliEpisode(season.id, { cid: 1300002, episodeNumber: '2' })
    ),
    da.episode.add(
      makeBilibiliEpisode(season.id, { cid: 1300003, episodeNumber: '3' })
    ),
  ])

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  // Episodes must be rendered before selectAll: it walks the visible tree.
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
