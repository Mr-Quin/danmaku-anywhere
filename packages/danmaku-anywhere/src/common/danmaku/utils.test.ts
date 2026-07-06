import {
  type CustomSeason,
  DanmakuSourceType,
  type GenericEpisode,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import {
  episodeProviderType,
  isCustomEpisode,
  isCustomSeason,
  isSourceEpisode,
  seasonProviderType,
} from './utils'

/**
 * The provider enum was dropped from stored entities, so source/custom are now
 * told apart structurally: a source episode carries a seasonId, a custom one
 * does not, and a custom season carries an isCustom === true tag.
 */

const sourceEpisode = {
  seasonId: 7,
  title: 'ep',
  season: { manifestId: 'dandanplay' },
} as unknown as GenericEpisode

const customEpisode = {
  title: 'local.mp4',
} as unknown as GenericEpisode

describe('episode discriminants', () => {
  it('treats an episode with a seasonId as a source episode', () => {
    expect(isSourceEpisode(sourceEpisode)).toBe(true)
    expect(isCustomEpisode(sourceEpisode)).toBe(false)
  })

  it('treats an episode without a seasonId as a custom episode', () => {
    expect(isCustomEpisode(customEpisode)).toBe(true)
    expect(isSourceEpisode(customEpisode)).toBe(false)
  })
})

describe('isCustomSeason', () => {
  it('is true only when isCustom is exactly true', () => {
    expect(isCustomSeason({ isCustom: true } as unknown as CustomSeason)).toBe(
      true
    )
  })

  it('is false when isCustom is false or absent', () => {
    expect(isCustomSeason({ isCustom: false } as unknown as Season)).toBe(false)
    expect(
      isCustomSeason({ manifestId: 'dandanplay' } as unknown as Season)
    ).toBe(false)
  })
})

describe('episodeProviderType', () => {
  it('returns MacCMS for a custom episode', () => {
    expect(episodeProviderType(customEpisode)).toBe(DanmakuSourceType.MacCMS)
  })

  it('derives a source episode type from its season manifestId', () => {
    expect(episodeProviderType(sourceEpisode)).toBe(
      DanmakuSourceType.DanDanPlay
    )
  })

  it('returns undefined for a source episode whose season has no manifestId', () => {
    const orphan = {
      seasonId: 7,
      title: 'ep',
      season: {},
    } as unknown as GenericEpisode
    expect(episodeProviderType(orphan)).toBeUndefined()
  })
})

describe('seasonProviderType', () => {
  it('maps a custom season to the MacCMS type', () => {
    expect(
      seasonProviderType({ isCustom: true } as unknown as CustomSeason)
    ).toBe(DanmakuSourceType.MacCMS)
  })

  it('derives a source season type from its manifestId', () => {
    expect(
      seasonProviderType({ manifestId: 'bilibili' } as unknown as Season)
    ).toBe(DanmakuSourceType.Bilibili)
  })

  it('returns undefined for an orphaned source season with no manifestId', () => {
    expect(seasonProviderType({} as unknown as Season)).toBeUndefined()
  })
})
