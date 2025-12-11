import { describe, expect, it } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { extractMediaInfo } from './extractMediaInfo'

function mockElement(text: string | undefined): Node | null {
  if (text === undefined) {
    return null
  }
  return { textContent: text } as Node
}

function createMediaElements({
  title,
  season,
  episode,
  episodeTitle,
}: {
  title: string
  season?: string
  episode?: string
  episodeTitle?: string
}): {
  title: Node
  season: Node | null
  episode: Node | null
  episodeTitle: Node | null
} {
  return {
    title: mockElement(title) as Node,
    season: mockElement(season),
    episode: mockElement(episode),
    episodeTitle: mockElement(episodeTitle),
  }
}

function mockPolicy(
  overrides: Partial<IntegrationPolicy> = {}
): IntegrationPolicy {
  return {
    options: {
      titleOnly: false,
      useAI: false,
      dandanplay: {
        useMatchApi: false,
      },
    },
    title: { regex: [], selector: [] }, // regex now array
    season: { regex: [], selector: [] },
    episode: { regex: [], selector: [] },
    episodeTitle: { regex: [], selector: [] },
    ...overrides,
  }
}

describe('extractMediaInfo', () => {
  it('should merge separate season string into title', () => {
    const elements = createMediaElements({
      title: 'My Show',
      season: 'S2',
      episode: 'E5',
    })

    const result = extractMediaInfo(elements, mockPolicy())

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
    const elements = createMediaElements({
      title: 'My Show S2',
      season: 'S2',
    })

    const result = extractMediaInfo(elements, mockPolicy())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.mediaInfo.seasonTitle).toBe('My Show S2') // No double "S2 S2"
    }
  })

  it('should merge Chinese format', () => {
    const elements = createMediaElements({
      title: '我的动画',
      season: '第二季',
    })

    const result = extractMediaInfo(elements, mockPolicy())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.mediaInfo.seasonTitle).toBe('我的动画 第二季')
    }
  })

  it('should extract episode strictly', () => {
    const elements = createMediaElements({
      title: 'Show',
      episode: 'Episode 12',
    })

    const result = extractMediaInfo(elements, mockPolicy())

    if (result.success) {
      expect(result.mediaInfo.episode).toBe(12)
    }
  })
})
