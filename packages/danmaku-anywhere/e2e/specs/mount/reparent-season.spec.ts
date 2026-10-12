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
 * A season belongs to the config id that fetched it. Deleting the built-in
 * Bilibili source orphans its season, and re-adding it (built-ins keep their
 * id) reattaches it with Refresh Metadata / Follow re-enabled. A deleted
 * self-hosted source re-created with the same server gets a new id, so its
 * season stays orphaned until a relink action exists.
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
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()

  await Popup.open(page, extensionId, '/providers')
  await popup.providers.deleteProvider(/Bilibili|B站/)
  await popup.dialog.confirm()
  await popup.toast.expectSuccess(/Source deleted|弹幕源已删除/)

  await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()

  const remaining = await da.providerConfig.list()
  await da.providerConfig.set([...remaining, BILIBILI_CONFIG])

  await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()

  await popup.mount.openContextMenu(seasonItem)
  await expect(popup.mount.contextMenuItem('refresh')).toBeEnabled()
  await expect(popup.mount.contextMenuItem('bookmarkAdd')).toBeEnabled()
})

const SELF_HOSTED = {
  id: '6c1d2e3f-4a5b-4c6d-8e7f-90a1b2c3d4e5',
  manifestId: 'dandanplay',
  name: 'Home Server',
  enabled: true,
  configValues: {
    baseUrl: 'https://ddp.home.invalid',
    auth: { enabled: false, headers: [] },
  },
}

test('a season stays orphaned when its self-hosted source is deleted and re-created', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    customProviders: [SELF_HOSTED],
    network: mockLoginProbes(),
  })

  const season = await da.season.add({
    manifestId: 'dandanplay',
    providerConfigId: SELF_HOSTED.id,
    indexedId: '5550',
    title: 'Home Show',
    type: '',
    providerIds: { animeId: 5550 },
    schemaVersion: 1,
  })
  await da.episode.add(makeBilibiliEpisode(season.id, { comments: COMMENTS }))

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()

  await Popup.open(page, extensionId, '/providers')
  await popup.providers.deleteProvider('Home Server')
  await popup.dialog.confirm()
  await popup.toast.expectSuccess(/Source deleted|弹幕源已删除/)

  const remaining = await da.providerConfig.list()
  await da.providerConfig.set([
    ...remaining,
    { ...SELF_HOSTED, id: '0b9c8d7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e' },
  ])

  await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeVisible()
  await expect(seasonItem).toContainText('Home Show')
})
