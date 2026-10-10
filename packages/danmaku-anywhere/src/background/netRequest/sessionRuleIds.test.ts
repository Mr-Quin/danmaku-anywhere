import { setRequestHeaderRule } from '@danmaku-anywhere/web-scraper'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addSessionRule } from './sessionRules'
import { setMediaCorsRule } from './setMediaCorsRule'

describe('session rule ids', () => {
  let rules: chrome.declarativeNetRequest.Rule[] = []

  beforeEach(() => {
    rules = []
    vi.stubGlobal('chrome', {
      declarativeNetRequest: {
        getSessionRules: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0))
          return [...rules]
        }),
        updateSessionRules: vi.fn(
          async (options: chrome.declarativeNetRequest.UpdateRuleOptions) => {
            await new Promise((resolve) => setTimeout(resolve, 0))
            const removed = options.removeRuleIds ?? []
            const kept = rules.filter((r) => !removed.includes(r.id))
            for (const rule of options.addRules ?? []) {
              if (kept.some((r) => r.id === rule.id)) {
                throw new Error(
                  `Rule with id ${rule.id} does not have a unique ID.`
                )
              }
              kept.push(rule)
            }
            rules = kept
          }
        ),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('never hands the same id to header rules and media CORS rules added concurrently', async () => {
    await Promise.all([
      setRequestHeaderRule({
        url: 'https://a.example.com',
        referer: 'https://source.example.com',
      }),
      setMediaCorsRule('https://cdn.example.com/1.mp4'),
      setRequestHeaderRule({
        url: 'https://b.example.com',
        referer: 'https://source.example.com',
      }),
      setMediaCorsRule('https://cdn.example.com/2.mp4'),
    ])

    const ids = rules.map((r) => r.id)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })

  it('keeps allocating fresh ids after a header rule lands between session rules', async () => {
    await addSessionRule((id) => ({
      id,
      action: { type: 'modifyHeaders', requestHeaders: [] },
      condition: { urlFilter: '|https://one.example.com' },
    }))
    await setRequestHeaderRule({
      url: 'https://two.example.com',
      referer: 'https://source.example.com',
    })
    await setMediaCorsRule('https://cdn.example.com/3.mp4')

    expect(new Set(rules.map((r) => r.id)).size).toBe(3)
  })

  it('replaces the previous header rule for the same url', async () => {
    const rule = {
      url: 'https://same.example.com',
      referer: 'https://source.example.com',
    }
    await setRequestHeaderRule(rule)
    const firstId = rules[0].id
    await setRequestHeaderRule(rule)

    expect(rules).toHaveLength(1)
    expect(rules[0].id).toBeGreaterThan(firstId)
  })
})
