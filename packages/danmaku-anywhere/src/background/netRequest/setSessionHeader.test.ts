import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionHeader } from './setSessionHeader'

describe('setSessionHeader', () => {
  let rules: any[] = []

  beforeEach(() => {
    rules = []

    const declarativeNetRequest = {
      getSessionRules: vi.fn().mockImplementation(async () => {
        // simulate async delay to encourage race conditions if mutex wasn't there
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
        return [...rules]
      }),
      updateSessionRules: vi.fn().mockImplementation(async (options) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
        if (options.addRules) {
          rules.push(...options.addRules)
        }
        if (options.removeRuleIds) {
          rules = rules.filter((r) => !options.removeRuleIds.includes(r.id))
        }
      }),
    }

    vi.stubGlobal('chrome', {
      declarativeNetRequest,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should set session header and return remove function', async () => {
    const removeCall = await setSessionHeader('https://example.com', {
      'X-Test': '1',
    })
    expect(rules).toHaveLength(1)
    expect(rules[0].id).toBe(1)
    expect(rules[0].action.requestHeaders[0].header).toBe('X-Test')

    await removeCall()
    expect(rules).toHaveLength(0)
  })

  it('should prevent race conditions and ensure unique IDs with concurrent calls', async () => {
    const iterations = 10
    const promises: Promise<() => Promise<void>>[] = []

    // Launch concurrent requests
    // Without the mutex, they would all try to set the same ID
    for (let i = 0; i < iterations; i++) {
      promises.push(
        setSessionHeader(`https://example.com/${i}`, { 'X-Test': `${i}` })
      )
    }

    await Promise.all(promises)

    expect(rules).toHaveLength(iterations)

    const ids = rules.map((r) => r.id)
    const uniqueIds = new Set(ids)

    // If race conditions occurred, we would have duplicate IDs
    expect(uniqueIds.size).toBe(iterations)

    // IDs should be sequential
    const sortedIds = ids.toSorted((a: number, b: number) => a - b)
    expect(sortedIds[0]).toBe(1)
    expect(sortedIds[iterations - 1]).toBe(iterations)
  })
})
