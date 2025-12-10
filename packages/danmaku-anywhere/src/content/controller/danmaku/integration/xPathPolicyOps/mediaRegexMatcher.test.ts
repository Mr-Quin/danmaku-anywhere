import { describe, expect, it } from 'vitest'
import { RegexUtils } from './mediaRegexMatcher'

describe('RegexUtils', () => {
  describe('extractSeason', () => {
    it('should prefer user regex', () => {
      // User regex matches number
      expect(RegexUtils.extractSeason('My Show S5', ['S(\\d+)'])?.value).toBe(
        '5'
      )
    })

    it('should handle common formats', () => {
      expect(RegexUtils.extractSeason('My Show S1')?.value).toBe(1)
      expect(RegexUtils.extractSeason('My Show Season 2')?.value).toBe(2)
      expect(RegexUtils.extractSeason('My Show Season2')?.value).toBe(2)
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.extractSeason('我的动画 第一季')?.value).toBe(1)
      expect(RegexUtils.extractSeason('我的动画 第2季')?.value).toBe(2)
    })

    it('should be strict (avoid false positives)', () => {
      // "DNS1" should NOT match "S1"
      expect(RegexUtils.extractSeason('DNS1')).toBe(null)
      // "Season1" -> strict boundary check?
      // Our regex is `/(?:^|\s)Season\s*(\d+)/i`
      expect(RegexUtils.extractSeason('TheSeason1')?.value).toBe(undefined) // Should assume fail if no space
      expect(RegexUtils.extractSeason('The Season 1')?.value).toBe(1)
    })

    it('should return raw match', () => {
      const res = RegexUtils.extractSeason('My Show S5')
      expect(res?.value).toBe(5)
      expect(res?.raw).toBe('S5')
    })
  })

  describe('extractEpisodeNumber', () => {
    it('should prefer user regex', () => {
      expect(
        RegexUtils.extractEpisodeNumber('My Show E5', ['E(\\d+)'])?.value
      ).toBe(5)
      expect(RegexUtils.extractEpisodeNumber('A2B', ['\\d'])?.value).toBe(2)
    })

    it('should handle common formats', () => {
      expect(RegexUtils.extractEpisodeNumber('My Show E1')?.value).toBe(1)
      expect(RegexUtils.extractEpisodeNumber('My Show E1')?.raw).toBe('E1')
      expect(RegexUtils.extractEpisodeNumber('My Show Episode 2')?.value).toBe(
        2
      )
      expect(RegexUtils.extractEpisodeNumber('My Show S1E03')?.value).toBe(3)
      expect(RegexUtils.extractEpisodeNumber('My Show S1E03')?.raw).toBe(
        'S1E03'
      )
      expect(RegexUtils.extractEpisodeNumber('S1E03')?.value).toBe(3)
      expect(RegexUtils.extractEpisodeNumber('episode 102')?.value).toBe(102)
    })

    it('should handle Chinese formats', () => {
      expect(RegexUtils.extractEpisodeNumber('我的动画 第一话')?.value).toBe(1)
      expect(RegexUtils.extractEpisodeNumber('我的动画 第一话')?.raw).toBe(
        '第一话'
      )
      expect(RegexUtils.extractEpisodeNumber('我的动画 第2集')?.value).toBe(2)
      expect(RegexUtils.extractEpisodeNumber('第1话 我的动画')?.value).toBe(1)
      expect(RegexUtils.extractEpisodeNumber('第12话')?.value).toBe(12)
    })

    it('should return raw match', () => {
      const res = RegexUtils.extractEpisodeNumber('My Show E05')
      expect(res?.value).toBe(5)
      expect(res?.raw).toBe('E05')
    })

    it('should be strict', () => {
      expect(RegexUtils.extractEpisodeNumber('Apple12')).toBe(null)
      expect(RegexUtils.extractEpisodeNumber('episode2')).toBe(null)
      expect(RegexUtils.extractEpisodeNumber('AppleE12')).toBe(null)
    })
  })
})
