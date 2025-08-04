import { beforeEach, describe, expect, it } from 'vitest'
import { SkipTarget } from './SkipTarget'

describe('SkipTarget', () => {
  let skipTarget: SkipTarget

  const defaultOptions = {
    commentTime: 10,
    targetTime: 20,
    text: 'Skip to 00:20',
    timestamp: '00:20',
    shown: false,
  }

  beforeEach(() => {
    skipTarget = new SkipTarget(defaultOptions)
  })

  describe('isInRange', () => {
    it('should return true when time is exactly at commentTime', () => {
      expect(skipTarget.isInRange(10)).toBe(true)
    })

    it('should return true when time is exactly at targetTime', () => {
      expect(skipTarget.isInRange(20)).toBe(true)
    })

    it('should return true when time is between commentTime and targetTime', () => {
      expect(skipTarget.isInRange(15)).toBe(true)
      expect(skipTarget.isInRange(12.5)).toBe(true)
      expect(skipTarget.isInRange(17.9)).toBe(true)
    })

    it('should return false when time is before commentTime', () => {
      expect(skipTarget.isInRange(9)).toBe(false)
      expect(skipTarget.isInRange(5)).toBe(false)
      expect(skipTarget.isInRange(0)).toBe(false)
    })

    it('should return false when time is after targetTime', () => {
      expect(skipTarget.isInRange(21)).toBe(false)
      expect(skipTarget.isInRange(25)).toBe(false)
      expect(skipTarget.isInRange(100)).toBe(false)
    })

    it('should handle decimal values correctly', () => {
      expect(skipTarget.isInRange(10.1)).toBe(true)
      expect(skipTarget.isInRange(19.9)).toBe(true)
      expect(skipTarget.isInRange(9.9)).toBe(false)
      expect(skipTarget.isInRange(20.1)).toBe(false)
    })

    it('should handle negative values', () => {
      const negativeTarget = new SkipTarget({
        commentTime: -5,
        targetTime: 5,
        text: 'Negative test',
        timestamp: '00:05',
        shown: false,
      })

      expect(negativeTarget.isInRange(-3)).toBe(true)
      expect(negativeTarget.isInRange(-6)).toBe(false)
      expect(negativeTarget.isInRange(6)).toBe(false)
    })

    it('should handle zero values', () => {
      const zeroTarget = new SkipTarget({
        commentTime: 0,
        targetTime: 5,
        text: 'Zero test',
        timestamp: '00:05',
        shown: false,
      })

      expect(zeroTarget.isInRange(0)).toBe(true)
      expect(zeroTarget.isInRange(2.5)).toBe(true)
      expect(zeroTarget.isInRange(-1)).toBe(false)
    })
  })

  describe('intersects', () => {
    let otherTarget: SkipTarget

    beforeEach(() => {
      // skipTarget: commentTime=10, targetTime=20
      otherTarget = new SkipTarget({
        commentTime: 15,
        targetTime: 25,
        text: 'Other target',
        timestamp: '00:25',
        shown: false,
      })
    })

    describe('overlapping cases', () => {
      it('should return true when other target overlaps at the end', () => {
        // skipTarget: 10-20, otherTarget: 15-25
        expect(skipTarget.intersects(otherTarget)).toBe(true)
        expect(otherTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when other target overlaps at the beginning', () => {
        const earlierTarget = new SkipTarget({
          commentTime: 5,
          targetTime: 15,
          text: 'Earlier target',
          timestamp: '00:15',
          shown: false,
        })

        // skipTarget: 10-20, earlierTarget: 5-15
        expect(skipTarget.intersects(earlierTarget)).toBe(true)
        expect(earlierTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when other target is completely contained within', () => {
        const containedTarget = new SkipTarget({
          commentTime: 12,
          targetTime: 18,
          text: 'Contained target',
          timestamp: '00:18',
          shown: false,
        })

        // skipTarget: 10-20, containedTarget: 12-18
        expect(skipTarget.intersects(containedTarget)).toBe(true)
        expect(containedTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when current target is completely contained within other', () => {
        const containerTarget = new SkipTarget({
          commentTime: 5,
          targetTime: 25,
          text: 'Container target',
          timestamp: '00:25',
          shown: false,
        })

        // skipTarget: 10-20, containerTarget: 5-25
        expect(skipTarget.intersects(containerTarget)).toBe(true)
        expect(containerTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when targets have exact same range', () => {
        const sameTarget = new SkipTarget({
          commentTime: 10,
          targetTime: 20,
          text: 'Same target',
          timestamp: '00:20',
          shown: false,
        })

        expect(skipTarget.intersects(sameTarget)).toBe(true)
        expect(sameTarget.intersects(skipTarget)).toBe(true)
      })
    })

    describe('touching edge cases', () => {
      it('should return true when targets touch at targetTime/commentTime boundary', () => {
        const touchingTarget = new SkipTarget({
          commentTime: 20, // Exactly at skipTarget's targetTime
          targetTime: 30,
          text: 'Touching target',
          timestamp: '00:30',
          shown: false,
        })

        // skipTarget: 10-20, touchingTarget: 20-30
        expect(skipTarget.intersects(touchingTarget)).toBe(true)
        expect(touchingTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when targets touch at commentTime/targetTime boundary', () => {
        const touchingTarget = new SkipTarget({
          commentTime: 5,
          targetTime: 10, // Exactly at skipTarget's commentTime
          text: 'Touching target',
          timestamp: '00:10',
          shown: false,
        })

        // skipTarget: 10-20, touchingTarget: 5-10
        expect(skipTarget.intersects(touchingTarget)).toBe(true)
        expect(touchingTarget.intersects(skipTarget)).toBe(true)
      })
    })

    describe('non-overlapping cases', () => {
      it('should return false when other target is completely before', () => {
        const beforeTarget = new SkipTarget({
          commentTime: 5,
          targetTime: 9,
          text: 'Before target',
          timestamp: '00:09',
          shown: false,
        })

        // skipTarget: 10-20, beforeTarget: 5-9
        expect(skipTarget.intersects(beforeTarget)).toBe(false)
        expect(beforeTarget.intersects(skipTarget)).toBe(false)
      })

      it('should return false when other target is completely after', () => {
        const afterTarget = new SkipTarget({
          commentTime: 21,
          targetTime: 30,
          text: 'After target',
          timestamp: '00:30',
          shown: false,
        })

        // skipTarget: 10-20, afterTarget: 21-30
        expect(skipTarget.intersects(afterTarget)).toBe(false)
        expect(afterTarget.intersects(skipTarget)).toBe(false)
      })
    })

    describe('edge cases with decimals', () => {
      it('should handle decimal overlaps correctly', () => {
        const decimalTarget = new SkipTarget({
          commentTime: 19.5,
          targetTime: 25.7,
          text: 'Decimal target',
          timestamp: '00:25',
          shown: false,
        })

        // skipTarget: 10-20, decimalTarget: 19.5-25.7
        expect(skipTarget.intersects(decimalTarget)).toBe(true)
        expect(decimalTarget.intersects(skipTarget)).toBe(true)
      })

      it('should handle very small gaps correctly', () => {
        const nearMissTarget = new SkipTarget({
          commentTime: 20.1,
          targetTime: 25,
          text: 'Near miss target',
          timestamp: '00:25',
          shown: false,
        })

        // skipTarget: 10-20, nearMissTarget: 20.1-25
        expect(skipTarget.intersects(nearMissTarget)).toBe(false)
        expect(nearMissTarget.intersects(skipTarget)).toBe(false)
      })
    })

    describe('zero-duration targets', () => {
      it('should handle targets with zero duration', () => {
        const pointTarget = new SkipTarget({
          commentTime: 15,
          targetTime: 15,
          text: 'Point target',
          timestamp: '00:15',
          shown: false,
        })

        // skipTarget: 10-20, pointTarget: 15-15
        expect(skipTarget.intersects(pointTarget)).toBe(true)
        expect(pointTarget.intersects(skipTarget)).toBe(true)
      })

      it('should handle both targets having zero duration', () => {
        const pointTarget1 = new SkipTarget({
          commentTime: 15,
          targetTime: 15,
          text: 'Point target 1',
          timestamp: '00:15',
          shown: false,
        })

        const pointTarget2 = new SkipTarget({
          commentTime: 15,
          targetTime: 15,
          text: 'Point target 2',
          timestamp: '00:15',
          shown: false,
        })

        expect(pointTarget1.intersects(pointTarget2)).toBe(true)
        expect(pointTarget2.intersects(pointTarget1)).toBe(true)
      })

      it('should handle non-intersecting zero-duration targets', () => {
        const pointTarget1 = new SkipTarget({
          commentTime: 15,
          targetTime: 15,
          text: 'Point target 1',
          timestamp: '00:15',
          shown: false,
        })

        const pointTarget2 = new SkipTarget({
          commentTime: 25,
          targetTime: 25,
          text: 'Point target 2',
          timestamp: '00:25',
          shown: false,
        })

        expect(pointTarget1.intersects(pointTarget2)).toBe(false)
        expect(pointTarget2.intersects(pointTarget1)).toBe(false)
      })
    })
  })
})
