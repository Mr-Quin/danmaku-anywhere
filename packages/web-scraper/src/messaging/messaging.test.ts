import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setRequestHeaderRule } from './messaging.js'

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
    vi.clearAllMocks()
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
    expect(findHeader(action.requestHeaders, 'Origin')?.value).toBe(
      'https://source.example.com'
    )
    expect(
      findHeader(action.responseHeaders, 'Access-Control-Allow-Origin')?.value
    ).toBe('*')
  })
})
