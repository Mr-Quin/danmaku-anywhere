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

  it('keys the same instance to one namespace regardless of http/https', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const httpKey = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'http://my-server/api' },
    })
    const httpsKey = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api' },
    })
    expect(httpKey).toBe(httpsKey)
  })

  it('collapses default ports so :443/:80 match the bare host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const bare = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api' },
    })
    const explicit443 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server:443/api' },
    })
    const explicit80 = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'http://my-server:80/api' },
    })
    expect(explicit443).toBe(bare)
    expect(explicit80).toBe(bare)
  })

  it('keeps a non-default port distinct from the bare host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const bare = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api' },
    })
    const ported = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server:8080/api' },
    })
    expect(ported).not.toBe(bare)
  })

  it('distinguishes instances that differ only by path prefix', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const a = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/inst-a/api' },
    })
    const b = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/inst-b/api' },
    })
    expect(a).not.toBe(b)
  })

  it('normalizes host case but not a case-sensitive path', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const upperHost = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://MY-SERVER/api' },
    })
    const lowerHost = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server/api' },
    })
    expect(upperHost).toBe(lowerHost)
  })

  it('tolerates a schemeless baseUrl that includes a port without losing the host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const a = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'my-server:8080/api' },
    })
    const b = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'other-host:8080/api' },
    })
    expect(a).not.toBe(b)
  })

  it('keys a schemeless host:port the same as its https form', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const schemeless = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'my-server:8080/api' },
    })
    const https = computeNamespaceKey({
      ...base,
      configValues: { baseUrl: 'https://my-server:8080/api' },
    })
    expect(schemeless).toBe(https)
  })

  it('tolerates a baseUrl with no scheme', () => {
    const withScheme = computeNamespaceKey({
      id: 'uuid-1',
      manifestId: 'dandanplay',
      configValues: { baseUrl: 'https://my-server/api' },
    })
    const noScheme = computeNamespaceKey({
      id: 'uuid-1',
      manifestId: 'dandanplay',
      configValues: { baseUrl: 'my-server/api' },
    })
    expect(noScheme).toBe(withScheme)
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
