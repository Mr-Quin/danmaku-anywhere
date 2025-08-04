import { describe, expect, it } from 'vitest'
import { matchTimeStamp } from './matchTimeStamp'

describe('matchTimeStamp', () => {
  describe('valid timestamp patterns', () => {
    it('should match "空降" pattern with colon separator', () => {
      const result = matchTimeStamp('空降10:30')

      expect(result).toEqual({
        minutes: 10,
        seconds: 30,
        targetTime: 630,
        timestamp: '10:30',
      })
    })

    it('should match "跳伞" pattern with colon separator', () => {
      const result = matchTimeStamp('跳伞5:45')

      expect(result).toEqual({
        minutes: 5,
        seconds: 45,
        targetTime: 345,
        timestamp: '05:45',
      })
    })

    it('should match "跳傘" pattern with Chinese colon separator', () => {
      const result = matchTimeStamp('跳傘25：15')

      expect(result).toEqual({
        minutes: 25,
        seconds: 15,
        targetTime: 1515,
        timestamp: '25:15',
      })
    })

    it('should match pattern with extra text before timestamp', () => {
      const result = matchTimeStamp('空降到op结束12:30')

      expect(result).toEqual({
        minutes: 12,
        seconds: 30,
        targetTime: 750,
        timestamp: '12:30',
      })
    })

    it('should match pattern with single digit seconds', () => {
      const result = matchTimeStamp('空降1:5')

      expect(result).toEqual({
        minutes: 1,
        seconds: 5,
        targetTime: 65,
        timestamp: '01:05',
      })
    })

    it('should match pattern with zero minutes', () => {
      const result = matchTimeStamp('跳伞0:30')

      expect(result).toEqual({
        minutes: 0,
        seconds: 30,
        targetTime: 30,
        timestamp: '00:30',
      })
    })

    it('should match pattern with large minute values', () => {
      const result = matchTimeStamp('空降123:45')

      expect(result).toEqual({
        minutes: 123,
        seconds: 45,
        targetTime: 7425,
        timestamp: '123:45',
      })
    })
  })

  describe('invalid patterns', () => {
    it('should return null for text without jump keywords', () => {
      const result = matchTimeStamp('普通弹幕内容')
      expect(result).toBeNull()
    })

    it('should return null for jump keywords without timestamp', () => {
      const result = matchTimeStamp('空降啦')
      expect(result).toBeNull()
    })

    it('should return null for malformed timestamp', () => {
      const result = matchTimeStamp('空降10-30')
      expect(result).toBeNull()
    })

    it('should return null for invalid seconds (>= 60)', () => {
      const result = matchTimeStamp('跳伞10:60')
      expect(result).toBeNull()
    })

    it('should return null for invalid seconds (>= 60) edge case', () => {
      const result = matchTimeStamp('跳伞5:99')
      expect(result).toBeNull()
    })

    // it('should return null for negative minutes', () => {
    //   const result = matchTimeStamp('空降-5:30')
    //   expect(result).toBeNull()
    // })

    it('should return null for negative seconds', () => {
      const result = matchTimeStamp('空降5:-30')
      expect(result).toBeNull()
    })

    it('should return null for non-numeric values', () => {
      const result = matchTimeStamp('空降abc:def')
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = matchTimeStamp('')
      expect(result).toBeNull()
    })

    it('should return null for partial matches', () => {
      const result = matchTimeStamp('空降10:')
      expect(result).toBeNull()
    })

    it('should return null for missing minutes', () => {
      const result = matchTimeStamp('空降:30')
      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple potential matches and use first valid one', () => {
      const result = matchTimeStamp('空降10:30然后跳伞20:45')

      // The regex should match the first valid pattern
      expect(result).toEqual({
        minutes: 10,
        seconds: 30,
        targetTime: 630,
        timestamp: '10:30',
      })
    })

    it('should handle zero seconds', () => {
      const result = matchTimeStamp('跳伞10:00')

      expect(result).toEqual({
        minutes: 10,
        seconds: 0,
        targetTime: 600,
        timestamp: '10:00',
      })
    })

    it('should handle maximum valid seconds (59)', () => {
      const result = matchTimeStamp('空降15:59')

      expect(result).toEqual({
        minutes: 15,
        seconds: 59,
        targetTime: 959,
        timestamp: '15:59',
      })
    })

    it('should handle text with mixed languages', () => {
      const result = matchTimeStamp('jump空降 to 10:30')

      expect(result).toEqual({
        minutes: 10,
        seconds: 30,
        targetTime: 630,
        timestamp: '10:30',
      })
    })
  })

  describe('timestamp formatting', () => {
    it('should pad single digit minutes with zero', () => {
      const result = matchTimeStamp('空降5:30')
      expect(result?.timestamp).toBe('05:30')
    })

    it('should pad single digit seconds with zero', () => {
      const result = matchTimeStamp('空降10:5')
      expect(result?.timestamp).toBe('10:05')
    })

    it('should pad both single digit minutes and seconds', () => {
      const result = matchTimeStamp('空降5:5')
      expect(result?.timestamp).toBe('05:05')
    })

    it('should not pad double digit values', () => {
      const result = matchTimeStamp('空降15:45')
      expect(result?.timestamp).toBe('15:45')
    })
  })

  describe('targetTime calculation', () => {
    it('should correctly calculate targetTime for various inputs', () => {
      const testCases: Array<{ input: string; expectedTime: number }> = [
        { input: '空降0:0', expectedTime: 0 },
        { input: '空降1:0', expectedTime: 60 },
        { input: '空降0:30', expectedTime: 30 },
        { input: '空降2:15', expectedTime: 135 },
        { input: '空降10:45', expectedTime: 645 },
        { input: '空降60:30', expectedTime: 3630 },
      ]

      for (const { input, expectedTime } of testCases) {
        const result = matchTimeStamp(input)
        expect(result?.targetTime).toBe(expectedTime)
      }
    })
  })
})
