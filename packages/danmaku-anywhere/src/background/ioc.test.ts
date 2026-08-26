import { describe, expect, it } from 'vitest'
import { DanmakuProviderFactory } from '@/background/services/providers/ProviderFactory'
import { LoggerSymbol } from '@/common/Logger'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { OptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { createBackgroundContainer } from './ioc'

/**
 * Background IoC wiring exposes a fresh, isolated production container.
 * This verifies the explicit multi-bindings and factories without resolving
 * browser-backed services.
 */
describe('createBackgroundContainer', () => {
  it('creates a container with its explicit bindings', () => {
    const testContainer = createBackgroundContainer()

    expect(testContainer.isBound(StoreServiceSymbol)).toBe(true)
    expect(testContainer.isBound(DanmakuProviderFactory)).toBe(true)
    expect(testContainer.isBound(OptionsServiceFactory)).toBe(true)
    expect(testContainer.isBound(LoggerSymbol)).toBe(true)
  })
})
