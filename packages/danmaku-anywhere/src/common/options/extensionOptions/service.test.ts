import { beforeEach, describe, expect, it } from 'vitest'
import { Language } from '@/common/localization/language'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  createOptionsContainer,
  readOptions,
  seedOptions,
} from '@/tests/optionsStore'

/**
 * Extension options migrate through every registered version step in order, so
 * each step's field writes are asserted against the shape the previous step
 * leaves behind. A step that throws on a stale shape must land the store on
 * defaults at the latest version rather than half-migrated.
 */

const STORAGE_KEY = 'extensionOptions'

async function seed(data: unknown, version: number) {
  await seedOptions(STORAGE_KEY, data, version)
}

async function readStored() {
  return readOptions<Record<string, unknown>>(STORAGE_KEY)
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
    expect(stored.version).toBe(27)
  })

  it('adds lang, theme and hotkeys on the way from version 1', async () => {
    await seed({ enabled: true }, 1)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(version).toBe(27)
    expect(data.lang).toBe(Language.zh)
    expect(data.theme).toEqual({ colorMode: 'system' })
    expect(data.hotkeys).toEqual(defaultExtensionOptions.hotkeys)
  })

  it('moves danmakuSources into provider config storage at version 21', async () => {
    await seed(
      {
        enabled: true,
        danmakuSources: {
          dandanplay: { enabled: true, baseUrl: '', useCustomRoot: false },
          bilibili: { enabled: true, danmakuTypePreference: 'xml' },
          tencent: { enabled: false, limitPerMin: 200 },
          iqiyi: { enabled: false, limitPerMin: 200 },
          custom: { enabled: true, baseUrl: 'https://zy.xmm.hk' },
        },
      },
      20
    )

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.danmakuSources).toBeUndefined()
    const providers = await providerConfigService.options.readUnblocked()
    expect(providers.map((config) => config.manifestId)).toContain('dandanplay')
  })

  it('fills the fields added by versions 22 through 27', async () => {
    await seed({ ...defaultExtensionOptions }, 21)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(version).toBe(27)
    expect(data.restrictInitiatorDomain).toBe(true)
    expect(data.playerOptions).toMatchObject({
      enableFullscreenInteraction: true,
    })
    expect(data.showFloatingButton).toBe(true)
    expect(data.autoBookmark).toBe(false)
    expect(data.infoPanel).toEqual({ enabled: true })
  })

  it('keeps a user hotkey that version 25 merges over the defaults', async () => {
    const userHotkey = { key: 'ctrl+shift+x', enabled: true }
    await seed(
      { ...defaultExtensionOptions, hotkeys: { toggleDanmaku: userHotkey } },
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
    expect(version).toBe(27)
  })
})
