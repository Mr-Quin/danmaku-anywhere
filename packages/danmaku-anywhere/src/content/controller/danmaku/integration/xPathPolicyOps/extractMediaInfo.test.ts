import { describe, expect, it, vi } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { extractMediaInfo } from './extractMediaInfo'

// Mock i18n
vi.mock('@/common/localization/i18n', () => ({
  i18n: {
    t: (key: string, defaultVal?: string, opts?: any) => {
      if (key === 'anime.numericSeason') return `Season ${opts?.season}`
      if (key === 'anime.numericEpisode') return `Episode ${opts?.episode}`
      return defaultVal || key
    },
  },
}))

// Mock MediaInfo to inspect constructor args easily if needed,
// though we can check the result object
vi.mock('@/content/controller/danmaku/integration/models/MediaInfo', () => {
  return {
    MediaInfo: class {
      constructor(
        public seasonTitle: string,
        public episode = 1,
        public seasonDecorator?: string,
        public episodeTitle?: string
      ) {}
    },
  }
})

function mockElement(text: string | undefined): any {
  if (text === undefined) return undefined
  return { textContent: text }
}

function mockPolicy(
  overrides: Partial<IntegrationPolicy> = {}
): IntegrationPolicy {
  return {
    id: 'test',
    name: 'test',
    host: 'test.com',
    url: 'test.com',
    options: { titleOnly: false },
    title: { regex: [], select: '' }, // regex now array
    season: { regex: [], select: '' },
    episode: { regex: [], select: '' },
    episodeTitle: { regex: [], select: '' },
    ...overrides,
  } as any
}

describe('extractMediaInfo', () => {
  it('should merge separate season string into title', () => {
    const titleEl = mockElement('My Show')
    const seasonEl = mockElement('S2')
    const episodeEl = mockElement('E5')

    const result = extractMediaInfo(
      { title: titleEl, season: seasonEl, episode: episodeEl } as any,
      mockPolicy()
    )

    expect(result.success).toBe(true)
    if (result.success) {
      // "My Show" + "S2" merged
      expect(result.mediaInfo.seasonTitle).toBe('My Show S2')
      expect(result.mediaInfo.episode).toBe(5)
      // seasonDecorator should be undefined as we merged it
      expect(result.mediaInfo.seasonDecorator).toBe(undefined)
    }
  })

  it('should NOT merge if already present', () => {
    const titleEl = mockElement('My Show S2')
    const seasonEl = mockElement('S2') // Redundant info

    const result = extractMediaInfo(
      { title: titleEl, season: seasonEl } as any,
      mockPolicy()
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.mediaInfo.seasonTitle).toBe('My Show S2') // No double "S2 S2"
    }
  })

  it('should merge Chinese format', () => {
    const titleEl = mockElement('我的动画')
    const seasonEl = mockElement('第二季')

    const result = extractMediaInfo(
      { title: titleEl, season: seasonEl } as any,
      mockPolicy()
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.mediaInfo.seasonTitle).toBe('我的动画 第二季')
    }
  })

  it('should extract episode strictly', () => {
    const titleEl = mockElement('Show')
    const episodeEl = mockElement('Episode 12')

    const result = extractMediaInfo(
      { title: titleEl, episode: episodeEl } as any,
      mockPolicy()
    )
    if (result.success) {
      expect(result.mediaInfo.episode).toBe(12)
    }
  })
})
