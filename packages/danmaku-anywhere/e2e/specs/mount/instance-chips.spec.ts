import { Language } from '../../../src/common/localization/language'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { Popup } from '../../pom/Popup'
import { makeBilibiliEpisode } from '../../setup/bilibiliSeed'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The built-in DanDanPlay and a self-hosted instance of the same manifest can
 * carry the same name, here in an English UI where the built-in shows as
 * DanDanPlay. Seeds one season under each and asserts their tree
 * chips read differently: the built-in keeps its name, the self-hosted one
 * adds its server host. A new instance also starts with its own default name,
 * and a user's mirror of the hosted proxy URL is not labelled built-in.
 */

const homeServer: ProviderConfig = {
  id: 'home-ddp',
  manifestId: 'dandanplay',
  name: 'DanDanPlay',
  enabled: true,
  configValues: {
    baseUrl: 'https://ddp.home.invalid',
    auth: { enabled: false, headers: [] },
  },
}

async function seedSeason(
  da: DaClient,
  providerConfigId: string,
  indexedId: string,
  title: string
): Promise<number> {
  const season = await da.season.add({
    manifestId: 'dandanplay',
    providerConfigId,
    indexedId,
    title,
    type: '',
    providerIds: { animeId: Number(indexedId) },
    schemaVersion: 1,
  })
  await da.episode.add(
    makeBilibiliEpisode(season.id, {
      comments: [{ p: '0.00,1,25,16777215,0,0,0,0', m: 'hi' }],
    })
  )
  return season.id
}

test('seasons of two same-named dandanplay instances get distinct chips', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    customProviders: [homeServer],
    extensionOptions: { lang: Language.en },
  })
  const builtinSeasonId = await seedSeason(
    da,
    'dandanplay',
    '1001',
    'Hosted Show'
  )
  const homeSeasonId = await seedSeason(da, homeServer.id, '1002', 'Home Show')

  const popup = await Popup.open(page, extensionId, '/mount')
  const builtinSeason = await popup.mount.waitForSeason(builtinSeasonId)
  const homeSeason = await popup.mount.waitForSeason(homeSeasonId)

  await expect(
    builtinSeason.getByText('DanDanPlay', { exact: true })
  ).toBeVisible()
  await expect(
    homeSeason.getByText('DanDanPlay (ddp.home.invalid)', { exact: true })
  ).toBeVisible()
})

test('a new dandanplay instance does not default to the built-in name', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.addDanDanPlayProvider()

  await expect(popup.providers.nameField()).toHaveValue(
    /^(Self-hosted DanDanPlay|自建弹弹play)$/
  )
})

test('a self-hosted mirror of the proxy URL is not labelled built-in', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    customProviders: [
      {
        ...homeServer,
        id: 'mirror-ddp',
        name: 'My DDP Mirror',
        configValues: {
          baseUrl: 'https://api.danmaku.test/ddp',
          auth: { enabled: false, headers: [] },
        },
      },
    ],
  })

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(popup.providers.row('My DDP Mirror')).toBeVisible()
  await expect(
    popup.providers.row(/^(DanDanPlay|弹弹play) \((Built-in|内置)\)$/)
  ).toBeVisible()
})
