import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { computeNamespaceKey } from '../../../src/common/providers/namespaceKey'
import { Popup } from '../../pom/Popup'
import { makeBilibiliEpisode } from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Editing a self-hosted config's baseUrl in a way that normalizes to the same
 * instance (http -> https) must NOT orphan that instance's seasons. namespaceKey
 * is scheme-agnostic, so the season's stored key still resolves the edited
 * config and the mount tree shows no orphan badge before or after the edit.
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

test('editing a self-hosted config http->https does not orphan its seasons', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [httpConfig] })

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

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await expect(popup.mount.seasonOrphanedBadge(season.id)).toBeHidden()

  await da.providerConfig.set([
    {
      ...httpConfig,
      configValues: {
        ...httpConfig.configValues,
        baseUrl: `https://${HOST}/api`,
      },
    },
  ])

  const reopened = await Popup.open(page, extensionId, '/mount')
  await reopened.mount.waitForSeason(season.id)
  await expect(reopened.mount.seasonOrphanedBadge(season.id)).toBeHidden()
})
