import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import {
  filterOverlappingTargets,
  parseCommentsForJumpTargets,
  parseTimestampsFromComment,
} from './videoSkipParser'

// Helper function to create mock CommentEntity
const createMockComment = (
  time: number,
  text: string,
  mode = 1,
  color = 16777215,
  uid = 'user123'
): CommentEntity => ({
  p: `${time},${mode},${color},${uid}`,
  m: text,
  cid: Math.floor(Math.random() * 1000000),
})

describe('parseTimestampsFromComment', () => {
  describe('valid timestamp comments', () => {
    it('should parse comment with valid jump timestamp', () => {
      const comment = createMockComment(60, '空降10:30')
      const result = parseTimestampsFromComment(comment)

      expect(result).toEqual({
        startTime: 60,
        endTime: 630,
        text: '空降10:30',
        timestamp: '10:30',
        shown: false,
      })
    })

    it('should parse comment with different jump keyword', () => {
      const comment = createMockComment(120.5, '跳伞5:45快进到正片')
      const result = parseTimestampsFromComment(comment)

      expect(result).toEqual({
        startTime: 120.5,
        endTime: 345,
        text: '跳伞5:45快进到正片',
        timestamp: '05:45',
        shown: false,
      })
    })

    it('should handle fractional comment time', () => {
      const comment = createMockComment(45.75, '跳傘15:20')
      const result = parseTimestampsFromComment(comment)

      expect(result).toEqual({
        startTime: 45.75,
        endTime: 920,
        text: '跳傘15:20',
        timestamp: '15:20',
        shown: false,
      })
    })
  })

  describe('invalid timestamp comments', () => {
    it('should return null for comment without timestamp', () => {
      const comment = createMockComment(60, '这是普通弹幕')
      const result = parseTimestampsFromComment(comment)

      expect(result).toBeNull()
    })

    it('should return null for comment with invalid timestamp format', () => {
      const comment = createMockComment(60, '空降10-30')
      const result = parseTimestampsFromComment(comment)

      expect(result).toBeNull()
    })

    it('should return null for comment with invalid seconds', () => {
      const comment = createMockComment(60, '跳伞10:60')
      const result = parseTimestampsFromComment(comment)

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle zero comment time', () => {
      const comment = createMockComment(0, '空降1:30')
      const result = parseTimestampsFromComment(comment)

      expect(result).toEqual({
        startTime: 0,
        endTime: 90,
        text: '空降1:30',
        timestamp: '01:30',
        shown: false,
      })
    })

    it('should handle comment with only required p fields', () => {
      const comment: CommentEntity = {
        p: '120,1,16777215',
        m: '跳伞5:00',
      }
      const result = parseTimestampsFromComment(comment)

      expect(result).toEqual({
        startTime: 120,
        endTime: 300,
        text: '跳伞5:00',
        timestamp: '05:00',
        shown: false,
      })
    })
  })
})

describe('filterOverlappingTargets', () => {
  const createJumpTarget = (
    startTime: number,
    endTime: number,
    text: string
  ): SkipTarget =>
    new SkipTarget({
      startTime,
      endTime,
      text,
      timestamp: `${Math.floor(endTime / 60)}:${(endTime % 60).toString().padStart(2, '0')}`,
    })

  describe('basic filtering', () => {
    it('should keep non-overlapping targets', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(180, 300, '跳伞5:00'),
        createJumpTarget(400, 600, '空降10:00'),
      ]

      const result = filterOverlappingTargets(targets)
      expect(result).toHaveLength(3)
      expect(result).toEqual(targets)
    })

    it('should filter targets with overlapping comment times', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(62, 180, '跳伞3:00'), // comment time too close (within default 5s buffer)
        createJumpTarget(180, 300, '空降5:00'),
      ]

      const result = filterOverlappingTargets(targets)
      expect(result).toHaveLength(2)
      expect(result).toEqual([targets[0], targets[2]])
    })

    it('should filter targets with overlapping target times', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(180, 123, '跳伞2:03'), // target time too close (within default 5s buffer)
        createJumpTarget(300, 400, '空降6:40'),
      ]

      const result = filterOverlappingTargets(targets)
      expect(result).toHaveLength(2)
      expect(result).toEqual([targets[0], targets[2]])
    })
  })

  describe('custom buffer sizes', () => {
    it('should respect custom comment time buffer', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(68, 180, '跳伞3:00'), // 8s difference
      ]

      // With default buffer (5s), should filter
      const resultDefault = filterOverlappingTargets(targets)
      expect(resultDefault).toHaveLength(1)

      // With larger buffer (10s), should filter
      const resultLarger = filterOverlappingTargets(targets, 10, 5)
      expect(resultLarger).toHaveLength(1)

      // With smaller buffer (3s), should keep both
      const resultSmaller = filterOverlappingTargets(targets, 3, 5)
      expect(resultSmaller).toHaveLength(2)
    })

    it('should respect custom target time buffer', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(180, 127, '跳伞2:07'), // 7s difference in target time
      ]

      // With default buffer (5s), should filter
      const resultDefault = filterOverlappingTargets(targets)
      expect(resultDefault).toHaveLength(1)

      // With larger buffer (10s), should filter
      const resultLarger = filterOverlappingTargets(targets, 5, 10)
      expect(resultLarger).toHaveLength(1)

      // With smaller buffer (3s), should keep both
      const resultSmaller = filterOverlappingTargets(targets, 5, 3)
      expect(resultSmaller).toHaveLength(2)
    })
  })

  describe('sorting and ordering', () => {
    it('should sort targets by comment time before filtering', () => {
      const targets = [
        createJumpTarget(180, 300, '跳伞5:00'),
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(300, 400, '空降6:40'),
      ]

      const result = filterOverlappingTargets(targets)
      expect(result).toHaveLength(3)
      // Should be sorted by comment time
      expect(result[0].startTime).toBe(60)
      expect(result[1].startTime).toBe(180)
      expect(result[2].startTime).toBe(300)
    })

    it('should prioritize earlier comments when filtering overlaps', () => {
      const targets = [
        createJumpTarget(62, 120, '跳伞2:00'),
        createJumpTarget(60, 180, '空降3:00'), // earlier comment time
        createJumpTarget(180, 300, '空降5:00'),
      ]

      const result = filterOverlappingTargets(targets)
      expect(result).toHaveLength(2)
      // Should keep the earlier comment (60s) and filter the later one (62s)
      expect(result[0].startTime).toBe(60)
      expect(result[1].startTime).toBe(180)
    })
  })

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = filterOverlappingTargets([])
      expect(result).toEqual([])
    })

    it('should handle single target', () => {
      const targets = [createJumpTarget(60, 120, '空降2:00')]
      const result = filterOverlappingTargets(targets)
      expect(result).toEqual(targets)
    })

    it('should handle exact buffer boundaries', () => {
      const targets = [
        createJumpTarget(60, 120, '空降2:00'),
        createJumpTarget(65, 125, '跳伞2:05'), // exactly 5s difference for both
      ]

      const result = filterOverlappingTargets(targets, 5, 5)
      expect(result).toHaveLength(1) // Should filter as it's not strictly less than buffer
    })
  })
})

describe('parseCommentsForJumpTargets', () => {
  const createCommentsWithJumps = () => [
    createMockComment(30, '普通弹幕内容'),
    createMockComment(60, '空降2:30'), // valid: 150s target, 90s difference
    createMockComment(120, '跳伞3:00'), // valid: 180s target, 60s difference
    createMockComment(200, '空降20:00'), // invalid: 1200s target, 1000s difference (> 180s default)
    createMockComment(300, '空降5:30'), // valid: 330s target, 30s difference
    createMockComment(350, '跳伞5:35'), // would overlap with previous (target time within 5s)
    createMockComment(500, '无效的弹幕'),
    createMockComment(600, '跳伞10:30'), // valid: 630s target, 30s difference
  ]

  describe('basic parsing', () => {
    it('should extract valid jump targets from comments', () => {
      const comments = createCommentsWithJumps()
      const result = parseCommentsForJumpTargets(comments)

      expect(result).toHaveLength(3) // Should filter out overlapping and invalid ones

      expect(result[0]).toEqual({
        startTime: 60,
        endTime: 150,
        text: '空降2:30',
        timestamp: '02:30',
        shown: false,
      })

      expect(result[1]).toEqual({
        startTime: 120,
        endTime: 180,
        text: '跳伞3:00',
        timestamp: '03:00',
        shown: false,
      })

      expect(result[2]).toEqual({
        startTime: 300,
        endTime: 330,
        text: '空降5:30',
        timestamp: '05:30',
        shown: false,
      })
    })

    it('should handle empty comments array', () => {
      const result = parseCommentsForJumpTargets([])
      expect(result).toEqual([])
    })

    it('should handle comments with no valid timestamps', () => {
      const comments = [
        createMockComment(60, '普通弹幕1'),
        createMockComment(120, '普通弹幕2'),
        createMockComment(180, '普通弹幕3'),
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toEqual([])
    })
  })

  describe('custom options', () => {
    it('should respect custom maxTimeDifference', () => {
      const comments = [
        createMockComment(60, '空降2:30'), // 90s difference
        createMockComment(120, '跳伞10:00'), // 480s difference
      ]

      // With default maxTimeDifference (180s), second should be filtered
      const resultDefault = parseCommentsForJumpTargets(comments)
      expect(resultDefault).toHaveLength(1)

      // With larger maxTimeDifference (500s), both should be kept
      const resultLarger = parseCommentsForJumpTargets(comments, {
        maxTimeDifference: 500,
      })
      expect(resultLarger).toHaveLength(2)

      // With smaller maxTimeDifference (50s), both should be filtered
      const resultSmaller = parseCommentsForJumpTargets(comments, {
        maxTimeDifference: 50,
      })
      expect(resultSmaller).toHaveLength(0)
    })

    it('should respect custom buffer options', () => {
      const comments = [
        createMockComment(60, '空降2:30'),
        createMockComment(66, '跳伞2:35'), // 6s comment time difference, 5s target time difference
      ]

      // With default buffers (5s), should filter
      const resultDefault = parseCommentsForJumpTargets(comments)
      expect(resultDefault).toHaveLength(1)

      // With larger buffers, should still filter
      const resultLarger = parseCommentsForJumpTargets(comments, {
        commentTimeBuffer: 10,
        targetTimeBuffer: 10,
      })
      expect(resultLarger).toHaveLength(1)

      // With smaller buffers, should keep both
      const resultSmaller = parseCommentsForJumpTargets(comments, {
        commentTimeBuffer: 3,
        targetTimeBuffer: 3,
      })
      expect(resultSmaller).toHaveLength(2)
    })

    it('should handle all custom options together', () => {
      const comments = [
        createMockComment(60, '空降5:00'), // 240s difference
        createMockComment(68, '跳伞5:05'), // 8s comment diff, 5s target diff, 237s time difference
      ]

      const result = parseCommentsForJumpTargets(comments, {
        maxTimeDifference: 250,
        commentTimeBuffer: 10,
        targetTimeBuffer: 10,
      })

      expect(result).toHaveLength(1) // Should filter due to overlapping targets
    })
  })

  describe('edge cases', () => {
    it('should handle comments with zero time difference', () => {
      const comments = [
        createMockComment(150, '空降2:30'), // target time = 150s, comment time = 150s, difference = 0
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toHaveLength(1)
      expect(result[0].endTime).toBe(150)
    })

    it('should handle negative time differences', () => {
      const comments = [
        createMockComment(200, '空降2:30'), // target time = 150s, comment time = 200s, difference = -50s
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toHaveLength(1) // Should still be valid (absolute difference used)
    })

    it('should maintain sorting after filtering', () => {
      const comments = [
        createMockComment(300, '空降6:00'),
        createMockComment(60, '跳伞2:00'),
        createMockComment(180, '空降4:00'),
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toHaveLength(3)

      // Should be sorted by comment time
      expect(result[0].startTime).toBe(60)
      expect(result[1].startTime).toBe(180)
      expect(result[2].startTime).toBe(300)
    })
  })

  describe('complex filtering scenarios', () => {
    it('should handle multiple overlapping groups', () => {
      const comments = [
        createMockComment(60, '空降2:00'), // group 1
        createMockComment(62, '跳伞2:05'), // overlaps with group 1
        createMockComment(180, '空降4:00'), // group 2
        createMockComment(182, '跳伞4:03'), // overlaps with group 2
        createMockComment(300, '空降6:00'), // group 3, standalone
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toHaveLength(3)

      // Should keep first from each group
      expect(result[0].startTime).toBe(60)
      expect(result[1].startTime).toBe(180)
      expect(result[2].startTime).toBe(300)
    })
  })
})
