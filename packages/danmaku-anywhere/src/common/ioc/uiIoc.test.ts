import { fakeBrowser } from '@webext-core/fake-browser'
import { Container } from 'inversify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { OptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { OptionsUpgraderSymbol } from '@/common/options/upgrade/OptionsUpgrader'
import { FrameRegistry } from '@/content/controller/danmaku/frame/FrameRegistry.service'
import { MaskProviderFactory } from '@/content/player/occlusion/maskProviderFactory'
import { PlayerScript } from '@/content/player/PlayerScript.service'

/**
 * UI IoC wiring must be constructible independently of its default export.
 * Importing the module must not read browser storage before an entrypoint
 * explicitly starts the UI language bootstrap. The extension's UI checks
 * readiness from the store descriptors and upgrades over RPC; only the
 * standalone build binds the stores and upgrades them in the page.
 */
describe('createUiContainer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not access storage when the module is imported', async () => {
    const get = vi.spyOn(fakeBrowser.storage.local, 'get')

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
      ReadinessService,
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

  it('binds the option store descriptors but no store to upgrade in the extension', async () => {
    const { createUiContainer } = await import('./uiIoc')
    const { OPTION_STORES, OptionStoreDescriptors } = await import(
      '@/common/options/optionStores'
    )
    const { OptionsUpgradeService } = await import(
      '@/common/options/upgrade/OptionsUpgradeService'
    )
    const container = createUiContainer()

    expect(container.get(OptionStoreDescriptors)).toBe(OPTION_STORES)
    expect(container.isBound(StoreServiceSymbol)).toBe(false)
    expect(() => container.get(OptionsUpgradeService)).toThrow()
  })

  it('upgrades over RPC in the extension', async () => {
    const { createUiContainer } = await import('./uiIoc')
    const { RpcOptionsUpgrader } = await import(
      '@/common/options/upgrade/RpcOptionsUpgrader'
    )

    expect(createUiContainer().get(OptionsUpgraderSymbol)).toBeInstanceOf(
      RpcOptionsUpgrader
    )
  })

  it('upgrades in the page in the standalone build', async () => {
    vi.stubEnv('VITE_STANDALONE', 'true')
    vi.resetModules()

    const { uiContainerModule } = await import('./uiIoc')
    const { OptionsUpgradeService } = await import(
      '@/common/options/upgrade/OptionsUpgradeService'
    )
    const moduleOnly = new Container({
      autobind: true,
      defaultScope: 'Singleton',
    })
    moduleOnly.load(uiContainerModule)

    expect(moduleOnly.get(OptionsUpgraderSymbol)).toBe(
      moduleOnly.get(OptionsUpgradeService)
    )
    const stores = moduleOnly
      .getAll<IStoreService>(StoreServiceSymbol)
      .map((store) => store.name)
    const backgroundStores = createBackgroundContainer()
      .getAll<IStoreService>(StoreServiceSymbol)
      .map((store) => store.name)
    expect(stores).toEqual(backgroundStores)
  })

  it('applies the stored language before the options are upgraded', async () => {
    await fakeBrowser.storage.sync.set({
      extensionOptions: { data: { lang: 'en' }, version: 1 },
    })
    const { i18n } = await import('@/common/localization/i18n')
    const changeLanguage = vi.fn()
    Object.assign(i18n, { changeLanguage })
    const { bootstrapUiLanguage, createUiContainer } = await import('./uiIoc')
    const container = createUiContainer()

    bootstrapUiLanguage(container)

    await vi.waitFor(() => {
      expect(changeLanguage).toHaveBeenCalledWith('en')
    })
    expect(container.get(ReadinessService).getState()).toEqual({
      status: 'pending',
    })
  })

  it('bootstraps the UI language once per container', async () => {
    const { defaultExtensionOptions } = await import(
      '@/common/options/extensionOptions/constant'
    )
    const { ExtensionOptionsService: OptionsService } = await import(
      '@/common/options/extensionOptions/service'
    )
    const { bootstrapUiLanguage, createUiContainer } = await import('./uiIoc')

    const firstContainer = createUiContainer()
    const firstGet = vi
      .spyOn(firstContainer.get(OptionsService).options, 'readUnblocked')
      .mockResolvedValue(defaultExtensionOptions)

    bootstrapUiLanguage(firstContainer)
    bootstrapUiLanguage(firstContainer)

    expect(firstGet).toHaveBeenCalledTimes(1)

    const secondContainer = createUiContainer()
    const secondGet = vi
      .spyOn(secondContainer.get(OptionsService).options, 'readUnblocked')
      .mockResolvedValue(defaultExtensionOptions)

    bootstrapUiLanguage(secondContainer)

    expect(secondGet).toHaveBeenCalledTimes(1)
  })
})
