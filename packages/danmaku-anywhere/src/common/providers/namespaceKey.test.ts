import { describe, expect, it } from 'vitest'
import { computeNamespaceKey } from './namespaceKey'

describe('computeNamespaceKey', () => {
  it('returns manifestId for a builtin where id === manifestId', () => {
    expect(
      computeNamespaceKey({ id: 'bilibili', manifestId: 'bilibili' }, [])
    ).toBe('bilibili')
  })

  it('returns manifestId for a builtin even when configValues.baseUrl is present', () => {
    expect(
      computeNamespaceKey(
        {
          id: 'dandanplay',
          manifestId: 'dandanplay',
          configValues: { baseUrl: 'https://api.dandanplay.net/api' },
        },
        ['baseUrl']
      )
    ).toBe('dandanplay')
  })

  it('returns a string starting with ns: for a custom instance with a valid baseUrl', () => {
    const key = computeNamespaceKey(
      {
        id: 'uuid-1',
        manifestId: 'dandanplay',
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    expect(key).toMatch(/^ns:/)
    expect(key).not.toBe('dandanplay')
  })

  it('produces the same key for baseUrl variants that normalize to the same origin', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const key1 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    const key2 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api/' },
      },
      ['baseUrl']
    )
    const key3 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/' },
      },
      ['baseUrl']
    )
    expect(key1).toBe(key2)
    expect(key1).toBe(key3)
  })

  it('keys the same instance to one namespace regardless of http/https', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const httpKey = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'http://my-server/api' },
      },
      ['baseUrl']
    )
    const httpsKey = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    expect(httpKey).toBe(httpsKey)
  })

  it('collapses default ports so :443/:80 match the bare host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const bare = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    const explicit443 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server:443/api' },
      },
      ['baseUrl']
    )
    const explicit80 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'http://my-server:80/api' },
      },
      ['baseUrl']
    )
    expect(explicit443).toBe(bare)
    expect(explicit80).toBe(bare)
  })

  it('keeps a non-default port distinct from the bare host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const bare = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    const ported = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server:8080/api' },
      },
      ['baseUrl']
    )
    expect(ported).not.toBe(bare)
  })

  it('distinguishes instances that differ only by path prefix', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const a = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/inst-a/api' },
      },
      ['baseUrl']
    )
    const b = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/inst-b/api' },
      },
      ['baseUrl']
    )
    expect(a).not.toBe(b)
  })

  it('normalizes host case but not a case-sensitive path', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const upperHost = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://MY-SERVER/api' },
      },
      ['baseUrl']
    )
    const lowerHost = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    expect(upperHost).toBe(lowerHost)
  })

  it('tolerates a schemeless baseUrl that includes a port without losing the host', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const a = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'my-server:8080/api' },
      },
      ['baseUrl']
    )
    const b = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'other-host:8080/api' },
      },
      ['baseUrl']
    )
    expect(a).not.toBe(b)
  })

  it('keys a schemeless host:port the same as its https form', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const schemeless = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'my-server:8080/api' },
      },
      ['baseUrl']
    )
    const https = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://my-server:8080/api' },
      },
      ['baseUrl']
    )
    expect(schemeless).toBe(https)
  })

  it('tolerates a baseUrl with no scheme', () => {
    const withScheme = computeNamespaceKey(
      {
        id: 'uuid-1',
        manifestId: 'dandanplay',
        configValues: { baseUrl: 'https://my-server/api' },
      },
      ['baseUrl']
    )
    const noScheme = computeNamespaceKey(
      {
        id: 'uuid-1',
        manifestId: 'dandanplay',
        configValues: { baseUrl: 'my-server/api' },
      },
      ['baseUrl']
    )
    expect(noScheme).toBe(withScheme)
  })

  it('returns manifestId when configValues is present but baseUrl is absent', () => {
    expect(
      computeNamespaceKey(
        {
          id: 'uuid-2',
          manifestId: 'dandanplay',
          configValues: {},
        },
        ['baseUrl']
      )
    ).toBe('dandanplay')
  })

  it('produces different keys for two different baseUrls with the same id and manifestId', () => {
    const base = { id: 'uuid-1', manifestId: 'dandanplay' }
    const key1 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://server-a/api' },
      },
      ['baseUrl']
    )
    const key2 = computeNamespaceKey(
      {
        ...base,
        configValues: { baseUrl: 'https://server-b/api' },
      },
      ['baseUrl']
    )
    expect(key1).not.toBe(key2)
  })
})

describe('computeNamespaceKey identityFields declaration', () => {
  it('shares one namespace when the manifest declares no identity fields', () => {
    const key = computeNamespaceKey(
      {
        id: 'uuid-1',
        manifestId: 'mango',
        configValues: { baseUrl: 'https://server-a/api' },
      },
      []
    )
    expect(key).toBe('mango')
  })

  it('keys instances by a non-baseUrl identity field', () => {
    const a = computeNamespaceKey(
      {
        id: 'uuid-1',
        manifestId: 'custom:src',
        configValues: { region: 'eu' },
      },
      ['region']
    )
    const b = computeNamespaceKey(
      {
        id: 'uuid-2',
        manifestId: 'custom:src',
        configValues: { region: 'us' },
      },
      ['region']
    )
    expect(a).toMatch(/^ns:/)
    expect(a).not.toBe(b)
  })

  it('is insensitive to identity field declaration order', () => {
    const config = {
      id: 'uuid-1',
      manifestId: 'custom:src',
      configValues: { baseUrl: 'https://my-server/api', region: 'eu' },
    }
    expect(computeNamespaceKey(config, ['baseUrl', 'region'])).toBe(
      computeNamespaceKey(config, ['region', 'baseUrl'])
    )
  })

  it('falls back to manifestId when every declared identity value is missing or blank', () => {
    expect(
      computeNamespaceKey(
        {
          id: 'uuid-1',
          manifestId: 'custom:src',
          configValues: { region: ' ' },
        },
        ['region', 'token']
      )
    ).toBe('custom:src')
  })

  it('hashes non-string identity values stably', () => {
    const a = computeNamespaceKey(
      { id: 'uuid-1', manifestId: 'custom:src', configValues: { port: 8080 } },
      ['port']
    )
    const b = computeNamespaceKey(
      { id: 'uuid-2', manifestId: 'custom:src', configValues: { port: 8080 } },
      ['port']
    )
    const c = computeNamespaceKey(
      { id: 'uuid-3', manifestId: 'custom:src', configValues: { port: 9090 } },
      ['port']
    )
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('distinguishes the same value under different field names', () => {
    const a = computeNamespaceKey(
      { id: 'u1', manifestId: 'custom:src', configValues: { alpha: 'x' } },
      ['alpha']
    )
    const b = computeNamespaceKey(
      { id: 'u1', manifestId: 'custom:src', configValues: { beta: 'x' } },
      ['beta']
    )
    expect(a).not.toBe(b)
  })

  it('keeps the builtin shortcut ahead of the declaration', () => {
    expect(
      computeNamespaceKey(
        {
          id: 'dandanplay',
          manifestId: 'dandanplay',
          configValues: { baseUrl: 'https://proxy.example/ddp' },
        },
        ['baseUrl']
      )
    ).toBe('dandanplay')
  })
})
