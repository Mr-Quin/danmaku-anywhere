import { ContainerModule } from 'inversify'
import { describe, expect, test } from 'vitest'
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
})
