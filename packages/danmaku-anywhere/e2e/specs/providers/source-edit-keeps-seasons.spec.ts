import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { Popup } from '../../pom/Popup'
import { makeBilibiliEpisode } from '../../setup/bilibiliSeed'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A season belongs to the config that fetched it, so editing that config never
 * detaches its seasons. Renaming a self-hosted instance and moving it to
 * another host through the editor keeps its season attached in the mount tree
 * (no orphan badge, refresh still offered, chip shows the new name). A season
 * whose config disappears from storage turns orphaned but stays visible with
 * its follow, so it can still be unfollowed.
 */

const selfHosted: ProviderConfig = {
  id: 'f3a1c2d4-5b6e-4f70-8a91-b2c3d4e5f607',
  manifestId: 'dandanplay',
  customName: 'SelfHosted',
  enabled: true,
  configValues: {
    baseUrl: 'http://my-server.invalid/api',
    auth: { enabled: false, headers: [] },
  },
}

async function seedSeasonUnder(
  da: DaClient,
  opts: { withEpisode: boolean } = { withEpisode: true }
): Promise<number> {
  const season = await da.season.add({
    manifestId: 'dandanplay',
    providerConfigId: selfHosted.id,
    indexedId: '12345',
    title: 'Self-hosted Show',
    type: '',
    providerIds: { animeId: 12345 },
    schemaVersion: 1,
  })
  if (opts.withEpisode) {
    await da.episode.add(
      makeBilibiliEpisode(season.id, {
        comments: [{ p: '0.00,1,25,16777215,0,0,0,0', m: 'hi' }],
      })
    )
  }
  return season.id
}

test('renaming a self-hosted source and moving it to another host keeps its seasons attached', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [selfHosted] })
  const seasonId = await seedSeasonUnder(da)

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('SelfHosted')
  await popup.providers.nameField().fill('Moved Server')
  await popup.providers.fillField(
    /Base URL|基础地址/,
    'https://other-host.invalid/api'
  )
  await popup.providers.save()
  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

  const mount = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await mount.mount.waitForSeason(seasonId)
  await expect(mount.mount.seasonOrphanedBadge(seasonId)).toBeHidden()
  await expect(
    seasonItem.getByText('Moved Server', { exact: true })
  ).toBeVisible()

  await mount.mount.openContextMenu(seasonItem)
  await expect(mount.mount.contextMenuItem('refresh')).toBeEnabled()

  const season = await da.season.get(seasonId)
  expect(season?.providerConfigId).toBe(selfHosted.id)
})

test('a followed season with no downloaded episodes stays visible when its config disappears', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [selfHosted] })
  const seasonId = await seedSeasonUnder(da, { withEpisode: false })
  await da.bookmark.add(seasonId, [
    {
      providerIds: { animeId: 12345, episodeId: 123450001 },
      indexedId: '123450001',
      title: 'Ep1',
      episodeNumber: '1',
    },
  ])

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(seasonId)
  await expect(popup.mount.seasonOrphanedBadge(seasonId)).toBeHidden()
  await expect(popup.mount.seasonEpisodeCount(seasonId)).toHaveText('0/1')

  await da.providerConfig.set([])

  const reopened = await Popup.open(page, extensionId, '/mount')
  await reopened.mount.waitForSeason(seasonId)
  await expect(reopened.mount.seasonOrphanedBadge(seasonId)).toBeVisible()
  await expect(reopened.mount.seasonEpisodeCount(seasonId)).toBeHidden()
})
