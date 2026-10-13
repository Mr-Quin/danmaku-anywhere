import { describe, expect, it } from 'vitest'
import {
  capabilitiesFromManifest,
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
      automaticMatch: true,
    })
  })

  it('keeps a search-only manifest out of automatic matching', () => {
    expect(capabilitiesFromManifest({ search: pipeline })).toEqual({
      ...NO_CAPABILITIES,
      search: true,
    })
  })

  it.each([
    'search',
    'episodes',
    'danmaku',
  ] as const)('needs a %s pipeline for automatic matching', (missing) => {
    const manifest = {
      search: pipeline,
      episodes: pipeline,
      danmaku: pipeline,
      [missing]: undefined,
    }
    expect(capabilitiesFromManifest(manifest).automaticMatch).toBe(false)
  })

  it('reads a parseUrl pipeline as URL parsing', () => {
    expect(capabilitiesFromManifest({ parseUrl: pipeline }).parseUrl).toBe(true)
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
