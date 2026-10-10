import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextSessionRuleId } from './sessionRuleIds.js'

describe('nextSessionRuleId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts above the ids of rules that survived a restart, even when first called concurrently', async () => {
    const getSessionRules = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      return [{ id: 7 }, { id: 3 }]
    })
    vi.stubGlobal('chrome', { declarativeNetRequest: { getSessionRules } })

    const ids = await Promise.all([nextSessionRuleId(), nextSessionRuleId()])

    expect(ids).toEqual([8, 9])
    expect(getSessionRules).toHaveBeenCalledTimes(1)
  })
})
