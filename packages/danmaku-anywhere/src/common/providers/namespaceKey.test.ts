import { describe, expect, it } from 'vitest'
import { computeNamespaceKey } from './namespaceKey'

describe('computeNamespaceKey', () => {
  it('returns manifestId for a builtin where id === manifestId', () => {
    expect(
      computeNamespaceKey({ id: 'bilibili', manifestId: 'bilibili' })
    ).toBe('bilibili')
  })

  it('returns manifestId for a builtin even when configValues.baseUrl is present', () => {
    expect(
      computeNamespaceKey({
        id: 'dandanplay',
        manifestId: 'dandanplay',
        configValues: { baseUrl: 'https://api.dandanplay.net/api' },
      })
    ).toBe('dandanplay')
  })

  it('returns a string starting with ns: for a custom instance with a valid baseUrl', () => {
    const key = computeNamespaceKey({
      id: 'uuid-1',
      manifestId: 'dandanplay',
      configValues: { baseUrl: 'https://my-server/api' },
    })
    expect(key).toMatch(/^ns:/)
    expect(key).not.toBe('dandanplay')
  })

  it('produces the same key for baseUrl variants that normalize to the same origin', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const key1 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api' },
    })
    const key2 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api/' },
    })
    const key3 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/' },
    })
    expect(key1).toBe(key2)
    expect(key1).toBe(key3)
  })

  it('returns manifestId when configValues is present but baseUrl is absent', () => {
    expect(
      computeNamespaceKey({
        id: 'uuid-2',
        manifestId: 'dandanplay',
        configValues: {},
      })
    ).toBe('dandanplay')
  })

  it('produces different keys for two different baseUrls with the same id and manifestId', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const key1 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://server-a/api' },
    })
    const key2 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://server-b/api' },
    })
    expect(key1).not.toBe(key2)
  })
})
