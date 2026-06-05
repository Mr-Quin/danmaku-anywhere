import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addSessionRule } from './sessionRules'
import { setMediaCorsRule } from './setMediaCorsRule'

/**
 * Covers the media CORS-bypass session rule: it injects `Access-Control-Allow-
 * Origin: *` as a response header on the `media` resource type with no initiator
 * restriction, removes cleanly, and draws ids from the same shared allocator so
 * concurrent rules never collide.
 */

describe('setMediaCorsRule', () => {
  let rules: any[] = []

  beforeEach(() => {
    rules = []
    vi.stubGlobal('chrome', {
      declarativeNetRequest: {
        getSessionRules: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0))
          return [...rules]
        }),
        updateSessionRules: vi.fn().mockImplementation(async (options) => {
          await new Promise((resolve) => setTimeout(resolve, 0))
          if (options.addRules) {
            rules.push(...options.addRules)
          }
          if (options.removeRuleIds) {
            rules = rules.filter((r) => !options.removeRuleIds.includes(r.id))
          }
        }),
      },
      runtime: {
        getURL: vi.fn().mockReturnValue('chrome-extension://test'),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds a media ACAO response-header rule with no initiator restriction', async () => {
    const handle = await setMediaCorsRule('https://cdn.example.com/video.mp4')
    expect(rules).toHaveLength(1)
    const rule = rules[0]
    expect(rule.action.type).toBe('modifyHeaders')
    expect(rule.action.responseHeaders).toEqual([
      { header: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
    ])
    expect(rule.condition.resourceTypes).toEqual(['media'])
    expect(rule.condition.urlFilter).toBe('|https://cdn.example.com/video.mp4')
    expect(rule.condition.initiatorDomains).toBeUndefined()

    await handle.removeRule()
    expect(rules).toHaveLength(0)
  })

  it('removes the rule when the handle goes out of scope', async () => {
    {
      await using _ = await setMediaCorsRule('https://cdn.example.com/a.mp4')
      expect(rules).toHaveLength(1)
    }
    expect(rules).toHaveLength(0)
  })

  it('draws collision-free ids from the shared allocator under concurrency', async () => {
    const handles = await Promise.all([
      setMediaCorsRule('https://cdn.example.com/1.mp4'),
      addSessionRule((id) => ({
        id,
        action: { type: 'modifyHeaders', requestHeaders: [] },
        condition: { urlFilter: '|https://api.example.com/2' },
      })),
      setMediaCorsRule('https://cdn.example.com/3.mp4'),
    ])
    const ids = rules.map((r) => r.id)
    expect(new Set(ids).size).toBe(3)
    await Promise.all(handles.map((h) => h.removeRule()))
    expect(rules).toHaveLength(0)
  })
})
