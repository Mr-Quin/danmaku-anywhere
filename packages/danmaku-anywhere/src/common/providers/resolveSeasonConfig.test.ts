import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { computeNamespaceKey } from './namespaceKey'
import { resolveSeasonConfig } from './resolveSeasonConfig'

const DDP_IDENTITY = { dandanplay: ['baseUrl'] }

function makeConfig(
  id: string,
  manifestId: string,
  configValues: Record<string, unknown> = {}
): ProviderConfig {
  return { id, manifestId, name: id, enabled: true, configValues }
}

describe('resolveSeasonConfig', () => {
  it('resolves a builtin season to its matching config', () => {
    const config = makeConfig('bilibili', 'bilibili')
    const result = resolveSeasonConfig(
      { manifestId: 'bilibili', namespaceKey: computeNamespaceKey(config, []) },
      [config],
      {}
    )
    expect(result).toBe(config)
  })

  it('picks the config whose namespaceKey matches among two configs sharing manifestId', () => {
    const configA = makeConfig('uuid-a', 'dandanplay', {
      baseUrl: 'https://server-a/api',
    })
    const configB = makeConfig('uuid-b', 'dandanplay', {
      baseUrl: 'https://server-b/api',
    })
    const result = resolveSeasonConfig(
      {
        manifestId: configB.manifestId,
        namespaceKey: computeNamespaceKey(configB, ['baseUrl']),
      },
      [configA, configB],
      DDP_IDENTITY
    )
    expect(result).toBe(configB)
  })

  it('returns a truthy result when multiple configs share the same (manifestId, namespaceKey)', () => {
    const configA = makeConfig('uuid-a', 'dandanplay', {
      baseUrl: 'https://shared/api',
    })
    const configB = makeConfig('uuid-b', 'dandanplay', {
      baseUrl: 'https://shared/api',
    })
    const sharedKey = computeNamespaceKey(configA, ['baseUrl'])
    const result = resolveSeasonConfig(
      { manifestId: 'dandanplay', namespaceKey: sharedKey },
      [configA, configB],
      DDP_IDENTITY
    )
    expect(result).toBeTruthy()
  })

  it('treats a manifest with no declared identity fields as one shared namespace', () => {
    const config = makeConfig('uuid-a', 'mango', {
      baseUrl: 'https://server-a/api',
    })
    const result = resolveSeasonConfig(
      { manifestId: 'mango', namespaceKey: 'mango' },
      [config],
      { mango: [] }
    )
    expect(result).toBe(config)
  })

  it('falls back to an empty declaration for an unknown manifest', () => {
    const config = makeConfig('uuid-a', 'gone:manifest', {
      baseUrl: 'https://server-a/api',
    })
    const result = resolveSeasonConfig(
      { manifestId: 'gone:manifest', namespaceKey: 'gone:manifest' },
      [config],
      {}
    )
    expect(result).toBe(config)
  })

  it('returns undefined when no config matches', () => {
    const config = makeConfig('bilibili', 'bilibili')
    const result = resolveSeasonConfig(
      { manifestId: 'iqiyi', namespaceKey: 'iqiyi' },
      [config],
      {}
    )
    expect(result).toBeUndefined()
  })

  it('returns undefined when namespaceKey is undefined', () => {
    const config = makeConfig('bilibili', 'bilibili')
    const result = resolveSeasonConfig(
      { manifestId: 'bilibili', namespaceKey: undefined },
      [config],
      {}
    )
    expect(result).toBeUndefined()
  })

  it('returns undefined when manifestId is undefined', () => {
    const config = makeConfig('bilibili', 'bilibili')
    const result = resolveSeasonConfig(
      { manifestId: undefined, namespaceKey: 'bilibili' },
      [config],
      {}
    )
    expect(result).toBeUndefined()
  })
})
