import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { readV150Store } from '@/tests/v150Backup'
import { defaultKeymap } from './hotkeys'
import { isInfoPanelEnabled } from './infoPanel'
import { type ExtensionOptions, extensionOptionsSchema } from './schema'
import { ExtensionOptionsService } from './service'

/**
 * Seeds chrome.storage.sync with the extensionOptions the v1.5.0 build wrote
 * (the e2e backup fixture, version 22) and runs the real upgrade chain to the
 * current version. Asserts every user value survives, the fields added since
 * v22 take their defaults, and the result satisfies the current schema.
 */

describe('extensionOptions upgrade from the v1.5.0 fixture', () => {
  const fixture = readV150Store<ExtensionOptions>('extensionOptions')
  let service: ExtensionOptionsService
  let upgraded: ExtensionOptions

  beforeEach(async () => {
    await fakeBrowser.storage.sync.set({ extensionOptions: fixture })
    service = createUpgradeContainer().get(ExtensionOptionsService)
    await service.options.upgrade({})
    upgraded = await service.get()
  })

  it('starts from version 22 and ends at the latest version', async () => {
    expect(fixture.version).toBe(22)
    expect(await service.options.getVersion()).toBe(
      service.options.latestVersion
    )
    expect(service.options.latestVersion).toBe(27)
  })

  it('keeps the language, theme and search preference', () => {
    expect(upgraded.lang).toBe('en')
    expect(upgraded.theme).toEqual({ colorMode: 'dark' })
    expect(upgraded.searchUsingSimplified).toBe(true)
  })

  it('keeps the retention policy', () => {
    expect(upgraded.retentionPolicy).toEqual({
      enabled: true,
      deleteCommentsAfter: 14,
    })
  })

  it('keeps the edited hotkeys', () => {
    expect(upgraded.hotkeys.refreshComments).toEqual({
      enabled: true,
      key: 'alt+r',
    })
    expect(upgraded.hotkeys.togglePip).toEqual({
      enabled: false,
      key: 'shift+p',
    })
  })

  it('keeps showSkipButton false while adding enableFullscreenInteraction', () => {
    expect(upgraded.playerOptions).toEqual({
      showSkipButton: false,
      showDanmakuTimeline: true,
      enableFullscreenInteraction: true,
    })
  })

  it('keeps the user id and the other stored flags', () => {
    expect(upgraded.id).toBe(fixture.data.id)
    expect(upgraded.enabled).toBe(true)
    expect(upgraded.debug).toBe(false)
    expect(upgraded.enableAnalytics).toBe(true)
    expect(upgraded.matchLocalDanmaku).toBe(true)
    expect(upgraded.restrictInitiatorDomain).toBe(true)
    expect(upgraded.showReleaseNotes).toBe(false)
  })

  it('adds the fields introduced after v22 with their defaults', () => {
    expect(upgraded.showFloatingButton).toBe(true)
    expect(upgraded.autoBookmark).toBe(false)
    expect(upgraded.infoPanel).toEqual({})
    expect(upgraded.hotkeys.openSearchPanel).toEqual(
      defaultKeymap.openSearchPanel
    )
  })

  it('leaves the info panel unset so it follows the build default', () => {
    expect(isInfoPanelEnabled(upgraded.infoPanel)).toBe(false)
    expect(isInfoPanelEnabled(upgraded.infoPanel, true)).toBe(true)
  })

  it('does not bring back the retired danmakuSources', () => {
    expect(upgraded).not.toHaveProperty('danmakuSources')
  })

  it('equals the stored values plus the new defaults and nothing else', () => {
    expect(upgraded).toEqual({
      ...fixture.data,
      playerOptions: {
        ...fixture.data.playerOptions,
        enableFullscreenInteraction: true,
      },
      hotkeys: {
        ...fixture.data.hotkeys,
        openSearchPanel: defaultKeymap.openSearchPanel,
      },
      showFloatingButton: true,
      autoBookmark: false,
      infoPanel: {},
    })
  })

  it('parses with the current schema without changing any value', () => {
    expect(extensionOptionsSchema.parse(upgraded)).toEqual(upgraded)
  })
})
