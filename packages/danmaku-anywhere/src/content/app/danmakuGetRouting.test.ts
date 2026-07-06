import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { isCustomDanmakuGetPayload } from './danmakuGetRouting'

/**
 * The external danmakuGet payload is whatever the web app got back from
 * episodeGetAll. Stored episodes no longer carry a provider tag, so routing
 * must discriminate structurally (custom episodes have no seasonId) while
 * still honoring the legacy provider: 'Custom' wire tag from older app
 * versions.
 */

const customLite = {
  id: 3,
  title: 'local upload',
  commentCount: 2,
  schemaVersion: 4,
  version: 1,
  timeUpdated: 0,
} as unknown as GenericEpisodeLite

const sourceLite = {
  id: 3,
  title: 'ep 1',
  commentCount: 2,
  seasonId: 7,
  indexedId: 'idx-1',
  providerIds: {},
  schemaVersion: 4,
  version: 1,
  timeUpdated: 0,
  season: { title: 'Show' },
} as unknown as GenericEpisodeLite

describe('isCustomDanmakuGetPayload', () => {
  it('routes a provider-less custom episode payload to custom', () => {
    expect(isCustomDanmakuGetPayload(customLite)).toBe(true)
  })

  it('routes a source episode payload to regular', () => {
    expect(isCustomDanmakuGetPayload(sourceLite)).toBe(false)
  })

  it('honors the legacy Custom wire tag from older web apps', () => {
    const legacy = {
      ...customLite,
      provider: 'Custom',
    } as unknown as GenericEpisodeLite
    expect(isCustomDanmakuGetPayload(legacy)).toBe(true)
  })
})
