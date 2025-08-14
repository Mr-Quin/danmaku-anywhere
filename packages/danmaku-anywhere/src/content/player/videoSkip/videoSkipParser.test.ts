import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { parseCommentsForJumpTargets } from './videoSkipParser'

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

// Note: Only testing parseCommentsForJumpTargets per new behavior

describe('parseCommentsForJumpTargets', () => {
  const createCommentsWithJumps = () => [
    createMockComment(30, '弹幕内容'),
    createMockComment(60, '空降2:30'), // valid: 150s target, 90s difference
    createMockComment(120, '跳伞3:00'), // merged with above
    createMockComment(200, '空降20:00'), // invalid: 1200s target, 1000s difference (> 300s default)
    createMockComment(300, '空降5:30'), // valid: 330s target, 30s difference
    createMockComment(350, '跳伞5:59'), // valid
    createMockComment(500, '弹幕'),
    createMockComment(600, '跳伞10:30'), // valid: 630s target, 30s difference
  ]

  describe('basic parsing', () => {
    it('should extract and merge overlapping jump targets from comments', () => {
      const comments = createCommentsWithJumps()
      const result = parseCommentsForJumpTargets(comments)

      console.log(result)

      expect(result).toHaveLength(4)

      expect(result[0]).toEqual({ startTime: 60, endTime: 180, shown: false })

      expect(result[1]).toEqual({ startTime: 300, endTime: 330, shown: false })

      expect(result[2]).toEqual({ startTime: 350, endTime: 359, shown: false })

      expect(result[3]).toEqual({ startTime: 600, endTime: 630, shown: false })
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
        createMockComment(180, '跳伞11:00'), // 480s difference
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

    // Buffer options no longer applicable in merged behavior; removed

    // Combined options related to buffers removed
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

    it('should maintain sorting after merging', () => {
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
    it('should merge multiple overlapping groups', () => {
      const comments = [
        createMockComment(60, '空降2:00'), // group 1
        createMockComment(62, '跳伞2:05'), // overlaps with group 1
        createMockComment(180, '空降4:00'), // group 2
        createMockComment(182, '跳伞4:03'), // overlaps with group 2
        createMockComment(300, '空降6:00'), // group 3, standalone
      ]

      const result = parseCommentsForJumpTargets(comments)
      expect(result).toHaveLength(3)

      // Should merge each group to a single target preserving earliest startTime
      expect(result[0].startTime).toBe(60)
      expect(result[1].startTime).toBe(180)
      expect(result[2].startTime).toBe(300)
    })
  })
})
