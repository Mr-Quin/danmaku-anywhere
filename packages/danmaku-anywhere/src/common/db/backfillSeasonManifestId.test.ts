import { describe, expect, it } from 'vitest'
import { resolveSeasonManifestId } from './backfillSeasonManifestId'

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
