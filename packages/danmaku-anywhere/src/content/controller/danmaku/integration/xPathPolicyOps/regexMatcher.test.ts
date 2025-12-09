import { describe, expect, it } from 'vitest'
import { RegexUtils } from './regexMatcher'

describe('RegexUtils', () => {
  describe('extractSeason', () => {
    it('should prefer user regex', () => {
      // User regex matches number
      expect(RegexUtils.extractSeason('My Show S5', 'S(\\d+)')?.value).toBe('5')
    })

    it('should handle common formats', () => {
      expect(RegexUtils.extractSeason('My Show S1')?.value).toBe('1')
      expect(RegexUtils.extractSeason('My Show Season 2')?.value).toBe('2')
      expect(RegexUtils.extractSeason('My Show Season2')?.value).toBe('2')
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.extractSeason('我的动画 第一季')?.value).toBe('1')
      expect(RegexUtils.extractSeason('我的动画 第2季')?.value).toBe('2')
    })

    it('should be strict (avoid false positives)', () => {
      // "DNS1" should NOT match "S1"
      expect(RegexUtils.extractSeason('DNS1')).toBe(null)
      // "Season1" -> strict boundary check?
      // Our regex is `/(?:^|\s)Season\s*(\d+)/i`
      expect(RegexUtils.extractSeason('TheSeason1')?.value).toBe(undefined) // Should assume fail if no space
      expect(RegexUtils.extractSeason('The Season 1')?.value).toBe('1')
    })

    it('should return raw match', () => {
      const res = RegexUtils.extractSeason('My Show S5')
      expect(res?.value).toBe('5')
      expect(res?.raw).toBe('S5')
    })
  })

  describe('extractEpisode', () => {
    it('should prefer user regex', () => {
      expect(RegexUtils.extractEpisode('My Show E5', 'E(\\d+)')?.value).toBe(5)
    })

    it('should handle common formats', () => {
      expect(RegexUtils.extractEpisode('My Show E1')?.value).toBe(1)
      expect(RegexUtils.extractEpisode('My Show Episode 2')?.value).toBe(2)
      expect(RegexUtils.extractEpisode('S1E03')?.value).toBe(3)
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.extractEpisode('我的动画 第一话')?.value).toBe(1)
      expect(RegexUtils.extractEpisode('我的动画 第2集')?.value).toBe(2)
    })

    it('should return raw match', () => {
      const res = RegexUtils.extractEpisode('My Show E05')
      expect(res?.value).toBe(5)
      expect(res?.raw).toBe('E05')
    })

    it('should handle trailing number heuristic', () => {
      expect(RegexUtils.extractEpisode('My Show 12')?.value).toBe(12)
    })

    it('should be strict', () => {
      // "Apple12" should not be episode 12?
      expect(RegexUtils.extractEpisode('Apple12')).toBe(null) // \s(\d+)$ requires space
      expect(RegexUtils.extractEpisode('Apple 12')?.value).toBe(12)
    })
  })
})
