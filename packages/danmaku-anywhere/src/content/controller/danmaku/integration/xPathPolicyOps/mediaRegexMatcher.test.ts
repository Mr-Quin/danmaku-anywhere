import { describe, expect, it } from 'vitest'
import { RegexUtils } from './mediaRegexMatcher'

describe('RegexUtils', () => {
  describe('runUserRegex', () => {
    it('should extract values using user patterns', () => {
      expect(
        RegexUtils.runUserRegex('Title S2', ['Title S(\\d+)'])?.value
      ).toBe('2')

      expect(
        RegexUtils.runUserRegex('败犬女主太多了！ 第03集 在战斗开始前就输了', [
          '(?<title>.+) 第(?<episode>\\d+)集 (?<episodeTitle>.*)',
        ])
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
      expect(RegexUtils.runUserRegex('My Show E5', ['E(\\d+)'])?.value).toBe(
        '5'
      )
      expect(RegexUtils.runUserRegex('A2B', ['\\d'])?.value).toBe('2')
    })
  })

  describe('findCommonSeason', () => {
    it('should handle common formats', () => {
      expect(RegexUtils.findCommonSeason('My Show S1')?.value).toBe(1)
      expect(RegexUtils.findCommonSeason('My Show Season 2')?.value).toBe(2)
      expect(RegexUtils.findCommonSeason('My Show Season2')?.value).toBe(2)
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.findCommonSeason('我的动画 第一季')?.value).toBe(1)
      expect(RegexUtils.findCommonSeason('我的动画 第2季')?.value).toBe(2)
    })

    it('should be strict (avoid false positives)', () => {
      expect(RegexUtils.findCommonSeason('DNS1')).toBe(null)
      expect(RegexUtils.findCommonSeason('TheSeason1')?.value).toBe(undefined)
      expect(RegexUtils.findCommonSeason('The Season 1')?.value).toBe(1)
    })

    it('should return raw match', () => {
      const res = RegexUtils.findCommonSeason('My Show S5')
      expect(res?.value).toBe(5)
      expect(res?.raw).toBe('S5')
    })
  })

  describe('findCommonEpisode', () => {
    it('should handle common formats', () => {
      expect(RegexUtils.findCommonEpisode('My Show E1')?.value).toBe(1)
      expect(RegexUtils.findCommonEpisode('My Show E1')?.raw).toBe('E1')
      expect(RegexUtils.findCommonEpisode('My Show Episode 2')?.value).toBe(2)
      expect(RegexUtils.findCommonEpisode('My Show S1E03')?.value).toBe(3)
      expect(RegexUtils.findCommonEpisode('S1E03')?.value).toBe(3)
      expect(RegexUtils.findCommonEpisode('episode 102')?.value).toBe(102)
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.findCommonEpisode('我的动画 第一话')?.value).toBe(1)
      expect(RegexUtils.findCommonEpisode('我的动画 第2集')?.value).toBe(2)
      expect(RegexUtils.findCommonEpisode('第1话 我的动画')?.value).toBe(1)
      expect(RegexUtils.findCommonEpisode('第12话')?.value).toBe(12)
    })

    it('should be strict', () => {
      // Testing the updated standard logic
      expect(RegexUtils.findCommonEpisode('Apple12')).toBe(null)
      expect(RegexUtils.findCommonEpisode('episode2')).toBe(null)
      expect(RegexUtils.findCommonEpisode('AppleE12')).toBe(null)
    })
  })
})
