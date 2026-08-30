import { ContainerModule } from 'inversify'
import { describe, expect, test } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { createTestContainer } from './createTestContainer'

const TestValue = Symbol.for('TestValue')

const productionModule = new ContainerModule(({ bind }) => {
  bind(TestValue).toConstantValue('production')
})

/**
 * Test containers load production bindings into a fresh graph, then replace
 * selected collaborators with deterministic constants at the call site.
 */
describe('createTestContainer', () => {
  test('loads modules and applies token overrides', () => {
    const container = createTestContainer(
      [productionModule],
      [{ identifier: TestValue, value: 'test' }]
    )

    expect(container.get(TestValue)).toBe('test')
  })

  test('creates isolated containers for the same production modules', () => {
    const firstContainer = createTestContainer([productionModule])
    const secondContainer = createTestContainer([productionModule])

    expect(firstContainer).not.toBe(secondContainer)
    expect(firstContainer.get(TestValue)).toBe('production')
    expect(secondContainer.get(TestValue)).toBe('production')
  })

  test('overrides an autobound class token from the real background module', () => {
    const fakeOptionsService = {
      get: () => Promise.resolve({}),
    } as unknown as ExtensionOptionsService // lint-specs-allow-cast: stand-in only needs identity, never real option data

    const container = createTestContainer(
      [backgroundContainerModule],
      [{ identifier: ExtensionOptionsService, value: fakeOptionsService }]
    )

    expect(container.get(ExtensionOptionsService)).toBe(fakeOptionsService)

    const stores = container.getAll<IStoreService>(StoreServiceSymbol)
    expect(stores).toContain(fakeOptionsService)
  })
})
