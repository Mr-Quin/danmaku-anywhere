import { describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { Language } from '@/common/localization/language'
import { migrateOptions } from '@/common/options/OptionsService/migrationOptions'
import type { IOptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import type {
  PrevOptions,
  Version,
  VersionConfig,
} from '@/common/options/OptionsService/types'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ColorMode } from '@/common/theme/enums'
import { defaultKeymap } from './hotkeys'
import { ExtensionOptionsService } from './service'

/**
 * Drives the real extensionOptions upgrade chain (defined inline in
 * ExtensionOptionsService) from the shape a v1.5.0 user has stored, through
 * versions 22 to 27, and asserts the resulting fields. Also covers the
 * defensive guards added for stale/partial stored shapes.
 */

function createLogger(): ILogger {
  const logger = {
    sub: () => logger,
    debug: vi.fn(),
    error: vi.fn(),
  }
  return logger as unknown as ILogger
}

// Constructing ExtensionOptionsService registers its real .version(n, ...)
// upgrade steps against this recorder instead of a live OptionsService, so
// the chain can be replayed directly through migrateOptions.
function captureVersions(): Version[] {
  const versions: Version[] = []
  const chainable = {
    version(version: number, config: VersionConfig) {
      versions.push({ version, ...config })
      return chainable
    },
  }
  const factory = (() => chainable) as unknown as IOptionsServiceFactory
  const providerConfigService = {
    options: { set: vi.fn() },
  } as unknown as ProviderConfigService

  new ExtensionOptionsService(createLogger(), providerConfigService, factory)

  return versions
}

function upgrade(data: PrevOptions, fromVersion: number) {
  return migrateOptions(
    { data, version: fromVersion },
    captureVersions(),
    createLogger(),
    {}
  )
}

// The shape stored on disk right after v21 ran: danmakuSources already
// migrated away, nothing from v22 onward exists yet.
function createV21Options(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    debug: false,
    lang: Language.zh,
    searchUsingSimplified: true,
    playerOptions: {
      showSkipButton: true,
      showDanmakuTimeline: false,
      enableFullscreenInteraction: false,
    },
    retentionPolicy: {
      enabled: true,
      deleteCommentsAfter: 14,
    },
    matchLocalDanmaku: false,
    theme: {
      colorMode: ColorMode.Dark,
    },
    hotkeys: {
      toggleEnableDanmaku: { key: 'ctrl+shift+b', enabled: true },
      togglePip: { key: 'shift+p', enabled: false },
      refreshComments: { key: 'shift+r', enabled: true },
      unmountComments: { key: 'shift+u', enabled: true },
      // openSearchPanel intentionally absent: exercises the v25 defensive merge
    },
    enableAnalytics: false,
    showReleaseNotes: false,
    id: 'user-123',
    ...overrides,
  }
}

describe('extensionOptions upgrade chain (v22 to v27)', () => {
  it('reaches v27 with all new fields defaulted', () => {
    const result = upgrade(createV21Options(), 21)

    expect(result.version).toBe(27)
    expect(result.data.restrictInitiatorDomain).toBe(true)
    expect(result.data.showFloatingButton).toBe(true)
    expect(result.data.autoBookmark).toBe(false)
    expect(result.data.infoPanel).toEqual({ enabled: true })
  })

  it('preserves pre-existing user values across the chain', () => {
    const result = upgrade(createV21Options(), 21)

    expect(result.data.lang).toBe(Language.zh)
    expect(result.data.searchUsingSimplified).toBe(true)
    expect(result.data.retentionPolicy).toEqual({
      enabled: true,
      deleteCommentsAfter: 14,
    })
    expect(result.data.matchLocalDanmaku).toBe(false)
    expect(result.data.theme).toEqual({ colorMode: ColorMode.Dark })
    expect(result.data.id).toBe('user-123')
    expect(result.data.enableAnalytics).toBe(false)
  })

  it('preserves the user playerOptions and applies the v23 fullscreen field', () => {
    const result = upgrade(createV21Options(), 21)

    expect(result.data.playerOptions).toEqual({
      showSkipButton: true,
      showDanmakuTimeline: false,
      enableFullscreenInteraction: true,
    })
  })

  describe('v25 hotkeys defensive merge', () => {
    it('fills in a hotkey missing from the stored map without touching custom bindings', () => {
      const result = upgrade(createV21Options(), 21)

      expect(result.data.hotkeys.openSearchPanel).toEqual(
        defaultKeymap.openSearchPanel
      )
      expect(result.data.hotkeys.toggleEnableDanmaku).toEqual({
        key: 'ctrl+shift+b',
        enabled: true,
      })
      expect(result.data.hotkeys.togglePip).toEqual({
        key: 'shift+p',
        enabled: false,
      })
    })

    it('fills in every default hotkey when the stored map is empty', () => {
      const result = upgrade(createV21Options({ hotkeys: {} }), 21)

      expect(result.data.hotkeys).toEqual(defaultKeymap)
    })

    it('falls back to the full default keymap when hotkeys is missing entirely', () => {
      const data = createV21Options()
      delete (data as Record<string, unknown>).hotkeys

      const result = upgrade(data, 21)

      expect(result.data.hotkeys).toEqual(defaultKeymap)
    })
  })

  describe('stale/partial stored shapes (v23 playerOptions guard)', () => {
    it('degrades to defaults instead of throwing when playerOptions is missing', () => {
      const data = createV21Options()
      delete (data as Record<string, unknown>).playerOptions

      expect(() => upgrade(data, 21)).not.toThrow()

      const result = upgrade(data, 21)
      expect(result.data.playerOptions).toEqual({
        showSkipButton: true,
        showDanmakuTimeline: true,
        enableFullscreenInteraction: true,
      })
      // The rest of the store survives; it is not reset to full defaults.
      expect(result.data.id).toBe('user-123')
      expect(result.data.theme).toEqual({ colorMode: ColorMode.Dark })
    })

    it('degrades to defaults instead of throwing when playerOptions is null', () => {
      const data = createV21Options({ playerOptions: null })

      expect(() => upgrade(data, 21)).not.toThrow()

      const result = upgrade(data, 21)
      expect(result.data.playerOptions).toEqual({
        showSkipButton: true,
        showDanmakuTimeline: true,
        enableFullscreenInteraction: true,
      })
    })
  })
})
