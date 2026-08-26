import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { OptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { MaskProviderFactory } from '@/content/player/occlusion/maskProviderFactory'

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
})
