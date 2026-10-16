import { describe, expect, it } from 'vitest'
import {
  canMatchBySearch,
  canResolveMapping,
  capabilitiesFromManifest,
  capabilitiesOf,
  LEGACY_MACCMS_CAPABILITIES,
  NO_CAPABILITIES,
} from './sourceCapabilities'

const pipeline = { steps: [] }

describe('capabilitiesFromManifest', () => {
  it('grants every capability to a manifest with every pipeline', () => {
    expect(
      capabilitiesFromManifest({
        search: pipeline,
        episodes: pipeline,
        danmaku: pipeline,
        season: pipeline,
        parseUrl: pipeline,
      })
    ).toEqual({
      search: true,
      episodes: true,
      danmaku: true,
      seasonRefresh: true,
      parseUrl: true,
    })
  })

  it('grants only search to a search-only manifest', () => {
    expect(capabilitiesFromManifest({ search: pipeline })).toEqual({
      ...NO_CAPABILITIES,
      search: true,
    })
  })
})

describe('canMatchBySearch', () => {
  it.each([
    'search',
    'episodes',
    'danmaku',
  ] as const)('needs a %s pipeline', (missing) => {
    const capabilities = capabilitiesFromManifest({
      search: pipeline,
      episodes: pipeline,
      danmaku: pipeline,
      [missing]: undefined,
    })
    expect(canMatchBySearch(capabilities)).toBe(false)
  })
})

describe('canResolveMapping', () => {
  it('needs episodes and danmaku but not search', () => {
    const capabilities = capabilitiesFromManifest({
      episodes: pipeline,
      danmaku: pipeline,
    })
    expect(canResolveMapping(capabilities)).toBe(true)
    expect(canMatchBySearch(capabilities)).toBe(false)
  })
})

describe('capabilitiesOf', () => {
  it('reads nothing from a removed or unavailable source', () => {
    expect(capabilitiesOf({ status: 'removed' })).toEqual(NO_CAPABILITIES)
    expect(
      capabilitiesOf({ status: 'unavailable', reason: 'not-registered' })
    ).toEqual(NO_CAPABILITIES)
    expect(capabilitiesOf(undefined)).toEqual(NO_CAPABILITIES)
  })
})

describe('LEGACY_MACCMS_CAPABILITIES', () => {
  it('allows search only', () => {
    expect(LEGACY_MACCMS_CAPABILITIES).toEqual({
      ...NO_CAPABILITIES,
      search: true,
    })
  })
})
