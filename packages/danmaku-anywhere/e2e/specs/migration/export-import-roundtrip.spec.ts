import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { ImportPage } from '../../pom/ImportPage'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Post-migration sanity: a season the v15 migration leaves orphaned (no
 * manifestId / namespaceKey) must survive an export -> delete -> re-import
 * round-trip. Guards the import path that previously queried the season identity
 * index with nullish keys, threw a DataError, and silently dropped the season.
 * Asserts the orphan badge before export, the import success dialog, and that
 * the season + its episode come back in the mount tree afterward.
 */

const COMMENTS: CommentEntity[] = [
  { p: '0.00,1,25,16777215,0,0,0,0', m: 'hello' },
  { p: '1.00,1,25,16777215,0,0,0,0', m: 'world' },
]

test('an orphaned season survives an export/import round-trip', async ({
  context,
  page,
  extensionId,
  da,
}, testInfo) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(
    makeBilibiliSeason({ manifestId: undefined, namespaceKey: undefined })
  )
  await da.episode.add(makeBilibiliEpisode(season.id, { comments: COMMENTS }))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 })
  await popup.mount.openItemMenu(seasonItem, 'exportBackup')
  const download = await downloadPromise
  const exportPath = testInfo.outputPath('roundtrip.json')
  await download.saveAs(exportPath)

  await da.season.delete(season.id)
  expect(await da.season.list()).toHaveLength(0)

  const importPage = await ImportPage.open(page, extensionId)
  await importPage.selectFiles(exportPath)
  await importPage.result.confirm()
  await importPage.result.expectSuccess()

  const restored = await da.season.list()
  expect(restored).toHaveLength(1)
  expect(restored[0].title).toBe(season.title)
  expect(restored[0].localEpisodeCount).toBe(1)

  // The popup does not live-refresh on background DB writes, so re-open it.
  const reopened = await Popup.open(page, extensionId, '/mount')
  await reopened.mount.waitForSeason(restored[0].id)
  await expect(reopened.mount.seasonOrphanedBadge(restored[0].id)).toBeVisible()
})
