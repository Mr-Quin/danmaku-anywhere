import { describe, expect, it } from 'vitest'
import { mediaRegexMatcher } from './mediaRegexMatcher'

describe('RegexUtils', () => {
  describe('runUserRegex', () => {
    it('should extract values using user patterns', () => {
      expect(
        mediaRegexMatcher.runUserRegex('Title S2', ['Title S(\\d+)'])?.value
      ).toBe('2')

      expect(
        mediaRegexMatcher.runUserRegex(
          '败犬女主太多了！ 第03集 在战斗开始前就输了',
          ['(?<title>.+) 第(?<episode>\\d+)集 (?<episodeTitle>.*)']
        )
      ).toEqual({
        value: '败犬女主太多了！',
        raw: '败犬女主太多了！ 第03集 在战斗开始前就输了',
        index: 0,
        groups: {
          title: '败犬女主太多了！',
          episode: '03',
          episodeTitle: '在战斗开始前就输了',
        },
      })
    })

    it('should support capture groups', () => {
      expect(
        mediaRegexMatcher.runUserRegex('My Show E5', ['E(\\d+)'])?.value
      ).toBe('5')
      expect(mediaRegexMatcher.runUserRegex('A2B', ['\\d'])?.value).toBe('2')
    })
  })

  describe('findCommonSeason', () => {
    it('should handle common formats', () => {
      expect(mediaRegexMatcher.findCommonSeason('My Show S1')?.value).toBe(1)
      expect(
        mediaRegexMatcher.findCommonSeason('My Show Season 2')?.value
      ).toBe(2)
      expect(mediaRegexMatcher.findCommonSeason('My Show Season2')?.value).toBe(
        2
      )
    })

    it('should handle Chinese formats', () => {
      expect(mediaRegexMatcher.findCommonSeason('我的动画 第一季')?.value).toBe(
        1
      )
      expect(mediaRegexMatcher.findCommonSeason('我的动画 第2季')?.value).toBe(
        2
      )
    })

    it('should be strict (avoid false positives)', () => {
      expect(mediaRegexMatcher.findCommonSeason('DNS1')).toBe(null)
      expect(mediaRegexMatcher.findCommonSeason('TheSeason1')?.value).toBe(
        undefined
      )
      expect(mediaRegexMatcher.findCommonSeason('The Season 1')?.value).toBe(1)
    })

    it('should return raw match', () => {
      const res = mediaRegexMatcher.findCommonSeason('My Show S5')
      expect(res?.value).toBe(5)
      expect(res?.raw).toBe('S5')
    })
  })

  describe('findCommonEpisode', () => {
    it('should handle common formats', () => {
      expect(mediaRegexMatcher.findCommonEpisode('My Show E1')?.value).toBe(1)
      expect(mediaRegexMatcher.findCommonEpisode('My Show E1')?.raw).toBe('E1')
      expect(
        mediaRegexMatcher.findCommonEpisode('My Show Episode 2')?.value
      ).toBe(2)
      expect(mediaRegexMatcher.findCommonEpisode('My Show S1E03')?.value).toBe(
        3
      )
      expect(mediaRegexMatcher.findCommonEpisode('S1E03')?.value).toBe(3)
      expect(mediaRegexMatcher.findCommonEpisode('episode 102')?.value).toBe(
        102
      )
    })

    it('should handle Chinese formats', () => {
      expect(
        mediaRegexMatcher.findCommonEpisode('我的动画 第一话')?.value
      ).toBe(1)
      expect(mediaRegexMatcher.findCommonEpisode('我的动画 第2集')?.value).toBe(
        2
      )
      expect(mediaRegexMatcher.findCommonEpisode('第1话 我的动画')?.value).toBe(
        1
      )
      expect(mediaRegexMatcher.findCommonEpisode('第12话')?.value).toBe(12)
    })

    it('should be strict', () => {
      // Testing the updated standard logic
      expect(mediaRegexMatcher.findCommonEpisode('Apple12')).toBe(null)
      expect(mediaRegexMatcher.findCommonEpisode('episode2')).toBe(null)
      expect(mediaRegexMatcher.findCommonEpisode('AppleE12')).toBe(null)
    })
  })
})
