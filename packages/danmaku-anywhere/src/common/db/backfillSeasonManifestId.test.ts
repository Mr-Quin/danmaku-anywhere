import { describe, expect, it } from 'vitest'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import {
  type BackfillProviderConfig,
  resolveSeasonManifestId,
  resolveSeasonNamespaceKey,
} from './backfillSeasonManifestId'

describe('resolveSeasonManifestId', () => {
  it('takes the manifestId of a matching live config', () => {
    const configs = new Map([['uuid-1', 'user-manifest']])

    expect(resolveSeasonManifestId('uuid-1', configs)).toBe('user-manifest')
  })

  it('returns a bare builtin id as the manifestId', () => {
    expect(resolveSeasonManifestId('bilibili', new Map())).toBe('bilibili')
  })

  it('strips a stray builtin: prefix before matching the builtin set', () => {
    expect(resolveSeasonManifestId('builtin:tencent', new Map())).toBe(
      'tencent'
    )
  })

  it('leaves an unrecoverable uuid orphan unset', () => {
    expect(resolveSeasonManifestId('uuid-orphan', new Map())).toBeUndefined()
  })

  it('returns unset for a non-string providerConfigId', () => {
    expect(resolveSeasonManifestId(undefined, new Map())).toBeUndefined()
    expect(resolveSeasonManifestId(null, new Map())).toBeUndefined()
  })

  it('does not mis-stamp a catalog orphan with the provider tag', () => {
    // A catalog season's config was deleted, so its uuid no longer resolves.
    // It must stay unset rather than fall back to the DanDanPlay builtin id.
    expect(resolveSeasonManifestId('catalog-uuid', new Map())).not.toBe(
      'dandanplay'
    )
    expect(resolveSeasonManifestId('catalog-uuid', new Map())).toBeUndefined()
  })

  it('does not treat legacy:maccms as a structural builtin manifestId', () => {
    expect(resolveSeasonManifestId('legacy:maccms', new Map())).toBeUndefined()
  })

  it('takes the catalog manifestId from a live catalog config', () => {
    const configs = new Map([['catalog-uuid', 'some-catalog-manifest']])

    expect(resolveSeasonManifestId('catalog-uuid', configs)).toBe(
      'some-catalog-manifest'
    )
  })

  it('prefers the live config over the builtin structural match', () => {
    const configs = new Map([['dandanplay', 'dandanplay']])

    expect(resolveSeasonManifestId('dandanplay', configs)).toBe('dandanplay')
  })
})

describe('resolveSeasonNamespaceKey', () => {
  const selfHosted: BackfillProviderConfig = {
    id: 'uuid-1',
    manifestId: 'dandanplay',
    configValues: { baseUrl: 'https://my-ddp.example/api' },
  }

  it('recomputes the namespaceKey from a matching self-hosted config', () => {
    const configs = new Map([['uuid-1', selfHosted]])

    const result = resolveSeasonNamespaceKey('uuid-1', configs)
    expect(result).toBe(computeNamespaceKey(selfHosted))
    expect(result).toMatch(/^ns:/)
  })

  it('returns the builtin id itself for a matching builtin config', () => {
    const builtin: BackfillProviderConfig = {
      id: 'bilibili',
      manifestId: 'bilibili',
    }
    const configs = new Map([['bilibili', builtin]])

    expect(resolveSeasonNamespaceKey('bilibili', configs)).toBe('bilibili')
  })

  it('returns a bare builtin id as the namespaceKey with no live config', () => {
    expect(resolveSeasonNamespaceKey('tencent', new Map())).toBe('tencent')
  })

  it('strips a stray builtin: prefix before matching the builtin set', () => {
    expect(resolveSeasonNamespaceKey('builtin:bilibili', new Map())).toBe(
      'bilibili'
    )
  })

  it('leaves an unrecoverable uuid orphan unset', () => {
    expect(resolveSeasonNamespaceKey('uuid-orphan', new Map())).toBeUndefined()
  })

  it('returns unset for a non-string providerConfigId', () => {
    expect(resolveSeasonNamespaceKey(undefined, new Map())).toBeUndefined()
    expect(resolveSeasonNamespaceKey(null, new Map())).toBeUndefined()
  })

  it('does not treat legacy:maccms as a structural builtin namespaceKey', () => {
    expect(
      resolveSeasonNamespaceKey('legacy:maccms', new Map())
    ).toBeUndefined()
  })
})
