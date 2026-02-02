import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
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
      runtime: {
        getURL: vi.fn().mockReturnValue('chrome-extension://test'),
      },
    })

    container.rebindSync(ExtensionOptionsService).toConstantValue({
      get: vi.fn().mockResolvedValue({}),
    } as any)
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

    await removeCall.removeRule()
    expect(rules).toHaveLength(0)
  })

  it('should remove the rule when going out of scope', async () => {
    {
      await using _ = await setSessionHeader('https://example.com', {
        'X-Test': '1',
      })
      // rule added
      expect(
        chrome.declarativeNetRequest.updateSessionRules
      ).toHaveBeenCalledTimes(1)
      expect(rules).toHaveLength(1)
    }
    // rule removed when out of scope
    expect(
      chrome.declarativeNetRequest.updateSessionRules
    ).toHaveBeenCalledTimes(2)
    expect(rules).toHaveLength(0)
  })

  it('should prevent race conditions and ensure unique IDs with concurrent calls', async () => {
    const iterations = 10
    const promises: Promise<{
      removeRule: () => Promise<void>
    }>[] = []

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

  it('should respect useInitiatorDomains option', async () => {
    // Test default/true
    {
      container.rebindSync(ExtensionOptionsService).toConstantValue({
        get: vi.fn().mockResolvedValue({}),
      } as any)

      const res = await setSessionHeader('https://example.com', {})
      expect(rules).toHaveLength(1)
      expect(rules[0].condition.initiatorDomains).toEqual(['test'])
      await res.removeRule()
    }

    // Test false
    {
      container.rebindSync(ExtensionOptionsService).toConstantValue({
        get: vi.fn().mockResolvedValue({ restrictInitiatorDomain: false }),
      } as any)

      const res = await setSessionHeader('https://example.com', {})
      expect(rules).toHaveLength(1)
      expect(rules[0].condition.initiatorDomains).toBeUndefined()
      await res.removeRule()
    }
  })
})
