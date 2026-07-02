import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { computeNamespaceKey } from '../../../src/common/providers/namespaceKey'
import { Popup } from '../../pom/Popup'
import { makeBilibiliEpisode } from '../../setup/bilibiliSeed'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * namespaceKey ties a self-hosted instance's seasons to its baseUrl. A baseUrl
 * edit that normalizes to the same instance (http -> https) must keep the
 * seasons resolved (no orphan badge); an edit to a genuinely different origin
 * (another host) must re-key and orphan them. Both are asserted via the mount
 * tree's orphan badge.
 */

const HOST = 'my-server.invalid'

const httpConfig: ProviderConfig = {
  id: 'custom-ddp-ns',
  manifestId: 'dandanplay',
  name: 'SelfHosted',
  enabled: true,
  configValues: {
    baseUrl: `http://${HOST}/api`,
    auth: { enabled: false, headers: [] },
  },
}

async function seedSeasonUnder(da: DaClient): Promise<number> {
  const season = await da.season.add({
    manifestId: 'dandanplay',
    namespaceKey: computeNamespaceKey(httpConfig),
    indexedId: '12345',
    title: 'Self-hosted Show',
    type: '',
    providerIds: { animeId: 12345 },
    schemaVersion: 1,
  })
  await da.episode.add(
    makeBilibiliEpisode(season.id, {
      comments: [{ p: '0.00,1,25,16777215,0,0,0,0', m: 'hi' }],
    })
  )
  return season.id
}

async function editBaseUrl(da: DaClient, baseUrl: string): Promise<void> {
  await da.providerConfig.set([
    { ...httpConfig, configValues: { ...httpConfig.configValues, baseUrl } },
  ])
}

test('editing a self-hosted config http->https keeps its seasons resolved', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [httpConfig] })
  const seasonId = await seedSeasonUnder(da)

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(seasonId)
  await expect(popup.mount.seasonOrphanedBadge(seasonId)).toBeHidden()

  await editBaseUrl(da, `https://${HOST}/api`)

  const reopened = await Popup.open(page, extensionId, '/mount')
  await reopened.mount.waitForSeason(seasonId)
  await expect(reopened.mount.seasonOrphanedBadge(seasonId)).toBeHidden()
})

test('moving a self-hosted config to a different host orphans its seasons', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [httpConfig] })
  const seasonId = await seedSeasonUnder(da)

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(seasonId)
  await expect(popup.mount.seasonOrphanedBadge(seasonId)).toBeHidden()

  await editBaseUrl(da, 'http://other-host.invalid/api')

  const reopened = await Popup.open(page, extensionId, '/mount')
  await reopened.mount.waitForSeason(seasonId)
  await expect(reopened.mount.seasonOrphanedBadge(seasonId)).toBeVisible()
})
