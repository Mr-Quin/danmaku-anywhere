import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { OptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { StandaloneUpgradeService } from '@/common/standalone/StandaloneUpgradeService'
import { FrameRegistry } from '@/content/controller/danmaku/frame/FrameRegistry.service'
import { MaskProviderFactory } from '@/content/player/occlusion/maskProviderFactory'
import { PlayerScript } from '@/content/player/PlayerScript.service'

/**
 * UI IoC wiring must be constructible independently of its default export.
 * Importing the module must not read browser storage before an entrypoint
 * explicitly starts the UI language bootstrap.
 */
describe('createUiContainer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('does not access storage when the module is imported', async () => {
    const get = vi.mocked(chrome.storage.local.get)

    await import('./uiIoc')

    expect(get).not.toHaveBeenCalled()
  })

  it('creates a container with its explicit bindings', async () => {
    const { createUiContainer } = await import('./uiIoc')
    const testContainer = createUiContainer()

    expect(testContainer.isBound(MaskProviderFactory)).toBe(true)
    expect(testContainer.isBound(OptionsServiceFactory)).toBe(true)
    expect(testContainer.isBound(LoggerSymbol)).toBe(true)
  })

  it('constructs every service resolved by UI entrypoints', async () => {
    const { createUiContainer } = await import('./uiIoc')
    const testContainer = createUiContainer()

    const services = [
      ExtensionOptionsService,
      FrameRegistry,
      PlayerScript,
      StandaloneUpgradeService,
    ]

    for (const service of services) {
      expect(testContainer.get(service)).toBeInstanceOf(service)
    }

    expect(testContainer.get(ExtensionOptionsService)).toBe(
      testContainer.get(ExtensionOptionsService)
    )
    expect(testContainer.get(MaskProviderFactory)).toBeTypeOf('function')
    expect(testContainer.get(OptionsServiceFactory)).toBeTypeOf('function')
  })
})
