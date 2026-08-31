import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it } from 'vitest'
import { UpgradeService } from '@/background/syncOptions/UpgradeService/UpgradeService'
import { Language } from '@/common/localization/language'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { createOptionsContainer, optionsStorage } from '@/tests/optionsStore'

/**
 * Extension options migrate through every registered version step in order, so
 * each step's field writes are asserted against the shape the previous step
 * leaves behind. A step that throws on a stale shape must land the store on
 * defaults at the latest version rather than half-migrated.
 */

const LATEST_VERSION = 27

const { seed, read: readStored } =
  optionsStorage<Record<string, unknown>>('extensionOptions')
const providerStorage = optionsStorage<ProviderConfig[]>('providerConfig')

const legacyDanmakuSources = {
  dandanplay: { enabled: true, baseUrl: '', useCustomRoot: false },
  bilibili: { enabled: true, danmakuTypePreference: 'xml' },
  tencent: { enabled: false, limitPerMin: 200 },
  iqiyi: { enabled: false, limitPerMin: 200 },
  custom: {
    enabled: true,
    baseUrl: 'https://zy.xmm.hk',
    danmuicuBaseUrl: 'https://api.danmu.icu',
  },
}

function enabledByManifest(configs: ProviderConfig[]) {
  return Object.fromEntries(
    configs.map((config) => [config.manifestId, config.enabled])
  )
}

let service: ExtensionOptionsService
let providerConfigService: ProviderConfigService

beforeEach(() => {
  const container = createOptionsContainer()
  service = container.get(ExtensionOptionsService)
  providerConfigService = container.get(ProviderConfigService)
})

describe('ExtensionOptionsService migrations', () => {
  it('seeds defaults at the latest version when nothing is stored', async () => {
    await service.options.upgrade()

    const stored = await readStored()
    expect(stored.data).toEqual(defaultExtensionOptions)
    expect(stored.version).toBe(LATEST_VERSION)
  })

  it('adds lang, theme and hotkeys on the way from version 1', async () => {
    await seed({ enabled: true }, 1)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(version).toBe(LATEST_VERSION)
    expect(data.lang).toBe(Language.zh)
    expect(data.theme).toEqual({ colorMode: 'system' })
    expect(data.hotkeys).toEqual(defaultExtensionOptions.hotkeys)
  })

  it('carries each source enabled flag into provider config storage at version 21', async () => {
    await seed({ enabled: true, danmakuSources: legacyDanmakuSources }, 20)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.danmakuSources).toBeUndefined()

    const providers = await providerConfigService.options.readUnblocked()
    expect(enabledByManifest(providers)).toEqual({
      dandanplay: true,
      bilibili: true,
      tencent: false,
      [LEGACY_MACCMS_ID]: true,
    })
  })

  it('fills the fields added by versions 22 through 27', async () => {
    const {
      restrictInitiatorDomain: _restrict,
      showFloatingButton: _floating,
      autoBookmark: _bookmark,
      infoPanel: _infoPanel,
      ...preV22
    } = defaultExtensionOptions
    await seed(
      {
        ...preV22,
        playerOptions: {
          ...preV22.playerOptions,
          enableFullscreenInteraction: false,
        },
      },
      21
    )

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(version).toBe(LATEST_VERSION)
    expect(data.restrictInitiatorDomain).toBe(true)
    expect(data.playerOptions).toMatchObject({
      enableFullscreenInteraction: true,
    })
    expect(data.showFloatingButton).toBe(true)
    expect(data.autoBookmark).toBe(false)
    expect(data.infoPanel).toEqual({ enabled: true })
  })

  it('adds openSearchPanel at version 25 without disturbing a user hotkey', async () => {
    const userHotkey = { key: 'ctrl+shift+x', enabled: true }
    const { openSearchPanel: _openSearchPanel, ...preV25Hotkeys } =
      defaultExtensionOptions.hotkeys
    await seed(
      {
        ...defaultExtensionOptions,
        hotkeys: { ...preV25Hotkeys, toggleDanmaku: userHotkey },
      },
      24
    )

    await service.options.upgrade()

    const { data } = await readStored()
    const hotkeys = data.hotkeys as Record<string, unknown>
    expect(hotkeys.toggleDanmaku).toEqual(userHotkey)
    expect(hotkeys.openSearchPanel).toEqual(
      defaultExtensionOptions.hotkeys.openSearchPanel
    )
  })

  it('resets the whole store to defaults when a step throws on a stale shape', async () => {
    await seed({}, 22)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(data).toEqual(defaultExtensionOptions)
    expect(version).toBe(LATEST_VERSION)
  })
})

describe('ExtensionOptionsService provider handoff under UpgradeService', () => {
  // Readiness stays closed until the run ends, so the write issued from inside
  // the version 21 step lands after the provider store has already upgraded
  // and reset itself to defaults. It has to win that race, and the version it
  // names is the one the store is left on.
  it('lands the migrated configs after the provider store resets itself', async () => {
    const container = createOptionsContainer({ ready: false })
    await seed({ enabled: true, danmakuSources: legacyDanmakuSources }, 20)

    await container.get(UpgradeService).upgrade()

    const providerStore = await providerStorage.read()
    expect(providerStore.version).toBe(5)
    expect(
      providerStore.data.map((config) => [config.manifestId, config.enabled])
    ).toEqual([
      ['dandanplay', true],
      ['bilibili', true],
      ['tencent', false],
      [LEGACY_MACCMS_ID, true],
    ])
  })

  it('leaves the migrated configs intact through a second upgrade run', async () => {
    const container = createOptionsContainer({ ready: false })
    await seed({ enabled: true, danmakuSources: legacyDanmakuSources }, 20)
    await container.get(UpgradeService).upgrade()

    await createOptionsContainer({ ready: false }).get(UpgradeService).upgrade()

    const providerStore = await providerStorage.read()
    expect(enabledByManifest(providerStore.data)).toEqual({
      dandanplay: true,
      bilibili: true,
      tencent: false,
      [LEGACY_MACCMS_ID]: true,
    })
  })
})
