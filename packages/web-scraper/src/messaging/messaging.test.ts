import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { removeRequestHeaderRule, setRequestHeaderRule } from './messaging.js'

const getSessionRules = vi.fn()
const updateSessionRules = vi.fn()

const getAddedRule = () => {
  return updateSessionRules.mock.calls[0][0].addRules[0]
}

const findHeader = (
  headers: chrome.declarativeNetRequest.ModifyHeaderInfo[] | undefined,
  name: string
) => {
  return headers?.find((h) => h.header === name)
}

describe('setRequestHeaderRule', () => {
  beforeEach(() => {
    getSessionRules.mockResolvedValue([])
    vi.stubGlobal('chrome', {
      declarativeNetRequest: { getSessionRules, updateSessionRules },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('sets Referer without an Origin override when origin is omitted', async () => {
    await setRequestHeaderRule({
      url: 'https://cdn.example.com',
      referer: 'https://source.example.com',
    })

    const { action } = getAddedRule()
    expect(findHeader(action.requestHeaders, 'Referer')?.value).toBe(
      'https://source.example.com'
    )
    expect(findHeader(action.requestHeaders, 'Origin')).toBeUndefined()
    expect(action.responseHeaders).toBeUndefined()
  })

  it('rewrites Origin and allows it back when origin is provided', async () => {
    await setRequestHeaderRule({
      url: 'https://cdn.example.com',
      referer: 'https://source.example.com',
      origin: 'https://source.example.com',
    })

    const { action } = getAddedRule()
    expect(findHeader(action.requestHeaders, 'Referer')?.value).toBe(
      'https://source.example.com'
    )
    expect(findHeader(action.requestHeaders, 'Origin')?.value).toBe(
      'https://source.example.com'
    )
    expect(
      findHeader(action.responseHeaders, 'Access-Control-Allow-Origin')?.value
    ).toBe('*')
  })

  it('scopes the rule to the requesting tab', async () => {
    await setRequestHeaderRule(
      {
        url: 'https://cdn.example.com',
        referer: 'https://source.example.com',
        origin: 'https://source.example.com',
      },
      42
    )

    expect(getAddedRule().condition.tabIds).toEqual([42])
  })

  describe('against installed session rules', () => {
    let rules: chrome.declarativeNetRequest.Rule[] = []
    const rule = {
      url: 'https://cdn.example.com',
      referer: 'https://source.example.com',
    }

    beforeEach(() => {
      rules = []
      getSessionRules.mockImplementation(async () => {
        return [...rules]
      })
      updateSessionRules.mockImplementation(
        async (options: chrome.declarativeNetRequest.UpdateRuleOptions) => {
          const removed = options.removeRuleIds ?? []
          rules = [
            ...rules.filter((r) => !removed.includes(r.id)),
            ...(options.addRules ?? []),
          ]
        }
      )
    })

    it('keeps the rule of another tab that requested the same url', async () => {
      await setRequestHeaderRule(rule, 1)
      await setRequestHeaderRule(rule, 2)
      await setRequestHeaderRule(rule, 1)

      expect(rules.map((r) => r.condition.tabIds)).toEqual([[2], [1]])
    })

    it('returns the id of the rule it installed', async () => {
      const ruleId = await setRequestHeaderRule(rule, 1)

      expect(rules.map((r) => r.id)).toEqual([ruleId])
    })

    it('removes the rule it installed for the same tab', async () => {
      const ruleId = await setRequestHeaderRule(rule, 1)

      await removeRequestHeaderRule(ruleId, 1)

      expect(rules).toHaveLength(0)
    })

    it('leaves a rule another tab installed in place', async () => {
      const ruleId = await setRequestHeaderRule(rule, 1)

      await removeRequestHeaderRule(ruleId, 2)

      expect(rules).toHaveLength(1)
    })

    it('ignores an id whose rule was already replaced', async () => {
      const firstId = await setRequestHeaderRule(rule, 1)
      const secondId = await setRequestHeaderRule(rule, 1)
      updateSessionRules.mockClear()

      await removeRequestHeaderRule(firstId, 1)

      expect(updateSessionRules).not.toHaveBeenCalled()
      expect(rules.map((r) => r.id)).toEqual([secondId])
    })

    it('still installs rules after updateSessionRules rejects', async () => {
      updateSessionRules.mockRejectedValueOnce(new Error('quota exceeded'))

      await expect(setRequestHeaderRule(rule, 1)).rejects.toThrow(
        'quota exceeded'
      )
      await setRequestHeaderRule(rule, 1)

      expect(rules).toHaveLength(1)
    })

    it('runs where Symbol.dispose is not defined', async () => {
      const realSymbol = globalThis.Symbol
      globalThis.Symbol = Object.create(realSymbol, {
        dispose: { value: undefined },
        asyncDispose: { value: undefined },
      })
      try {
        await setRequestHeaderRule(rule, 1)
      } finally {
        globalThis.Symbol = realSymbol
      }
      await setRequestHeaderRule(rule, 2)

      expect(rules).toHaveLength(2)
    })
  })
})
