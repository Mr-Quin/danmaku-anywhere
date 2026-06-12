import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A season reparents onto a re-added config that shares its namespace. Seeds a
 * live Bilibili season (asserts it is NOT orphaned and its actions are enabled),
 * deletes the Bilibili provider (asserts the season goes orphaned and Refresh
 * Metadata / Follow disable), then re-adds the same-identity Bilibili config and
 * asserts the season is no longer orphaned and those actions re-enable.
 */

const COMMENTS: CommentEntity[] = [
  { p: '1,1,16777215', m: 'first' },
  { p: '2,1,16777215', m: 'second' },
]

const BILIBILI_CONFIG = {
  id: 'bilibili',
  manifestId: 'bilibili',
  name: 'Bilibili',
  enabled: true,
  configValues: { danmakuFormat: 'xml' as const },
}

test('a season reparents when its source config is re-added', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockLoginProbes(),
  })

  const season = await da.season.add(makeBilibiliSeason())
  await da.episode.add(makeBilibiliEpisode(season.id, { comments: COMMENTS }))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()

  await popup.mount.openContextMenu(seasonItem)
  await expect(popup.mount.contextMenuItem('refresh')).toBeEnabled()
  await expect(popup.mount.contextMenuItem('bookmarkAdd')).toBeEnabled()
  await page.keyboard.press('Escape')

  await Popup.open(page, extensionId, '/providers')
  await popup.providers.deleteProvider('Bilibili')
  await popup.dialog.confirm()
  await popup.toast.expectSuccess(/Provider deleted|弹幕源已删除/)

  await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()
  await popup.mount.openContextMenu(popup.mount.seasonItem(season.id))
  await expect(popup.mount.contextMenuItem('refresh')).toBeDisabled()
  await expect(popup.mount.contextMenuItem('bookmarkAdd')).toBeDisabled()
  await page.keyboard.press('Escape')

  // Re-add the Bilibili config with the same id/manifestId, so it resolves to
  // the same namespaceKey the orphaned season still carries.
  const remaining = await da.providerConfig.list()
  await da.providerConfig.set([...remaining, BILIBILI_CONFIG])

  await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()
  await popup.mount.openContextMenu(popup.mount.seasonItem(season.id))
  await expect(popup.mount.contextMenuItem('refresh')).toBeEnabled()
  await expect(popup.mount.contextMenuItem('bookmarkAdd')).toBeEnabled()
})
