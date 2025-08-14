import { beforeEach, describe, expect, it } from 'vitest'
import { SkipTarget } from './SkipTarget'

describe('SkipTarget', () => {
  let skipTarget: SkipTarget

  const defaultOptions = {
    startTime: 10,
    endTime: 20,
  }

  beforeEach(() => {
    skipTarget = new SkipTarget(defaultOptions)
  })

  describe('isInRange', () => {
    it('should return true when time is exactly at startTime', () => {
      expect(skipTarget.isInRange(10)).toBe(true)
    })

    it('should return true when time is exactly at endTime', () => {
      expect(skipTarget.isInRange(20)).toBe(true)
    })

    it('should return true when time is between startTime and endTime', () => {
      expect(skipTarget.isInRange(15)).toBe(true)
      expect(skipTarget.isInRange(12.5)).toBe(true)
      expect(skipTarget.isInRange(17.9)).toBe(true)
    })

    it('should return false when time is before startTime', () => {
      expect(skipTarget.isInRange(9)).toBe(false)
      expect(skipTarget.isInRange(5)).toBe(false)
      expect(skipTarget.isInRange(0)).toBe(false)
    })

    it('should return false when time is after endTime', () => {
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
        startTime: -5,
        endTime: 5,
      })

      expect(negativeTarget.isInRange(-3)).toBe(true)
      expect(negativeTarget.isInRange(-6)).toBe(false)
      expect(negativeTarget.isInRange(6)).toBe(false)
    })

    it('should handle zero values', () => {
      const zeroTarget = new SkipTarget({
        startTime: 0,
        endTime: 5,
      })

      expect(zeroTarget.isInRange(0)).toBe(true)
      expect(zeroTarget.isInRange(2.5)).toBe(true)
      expect(zeroTarget.isInRange(-1)).toBe(false)
    })
  })

  describe('intersects', () => {
    let otherTarget: SkipTarget

    beforeEach(() => {
      // skipTarget: startTime=10, endTime=20
      otherTarget = new SkipTarget({
        startTime: 15,
        endTime: 25,
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
          startTime: 5,
          endTime: 15,
        })

        // skipTarget: 10-20, earlierTarget: 5-15
        expect(skipTarget.intersects(earlierTarget)).toBe(true)
        expect(earlierTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when other target is completely contained within', () => {
        const containedTarget = new SkipTarget({
          startTime: 12,
          endTime: 18,
        })

        // skipTarget: 10-20, containedTarget: 12-18
        expect(skipTarget.intersects(containedTarget)).toBe(true)
        expect(containedTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when current target is completely contained within other', () => {
        const containerTarget = new SkipTarget({
          startTime: 5,
          endTime: 25,
        })

        // skipTarget: 10-20, containerTarget: 5-25
        expect(skipTarget.intersects(containerTarget)).toBe(true)
        expect(containerTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when targets have exact same range', () => {
        const sameTarget = new SkipTarget({
          startTime: 10,
          endTime: 20,
        })

        expect(skipTarget.intersects(sameTarget)).toBe(true)
        expect(sameTarget.intersects(skipTarget)).toBe(true)
      })
    })

    describe('touching edge cases', () => {
      it('should return true when targets touch at endTime/startTime boundary', () => {
        const touchingTarget = new SkipTarget({
          startTime: 20, // Exactly at skipTarget's endTime
          endTime: 30,
        })

        // skipTarget: 10-20, touchingTarget: 20-30
        expect(skipTarget.intersects(touchingTarget)).toBe(true)
        expect(touchingTarget.intersects(skipTarget)).toBe(true)
      })

      it('should return true when targets touch at startTime/endTime boundary', () => {
        const touchingTarget = new SkipTarget({
          startTime: 5,
          endTime: 10, // Exactly at skipTarget's startTime
        })

        // skipTarget: 10-20, touchingTarget: 5-10
        expect(skipTarget.intersects(touchingTarget)).toBe(true)
        expect(touchingTarget.intersects(skipTarget)).toBe(true)
      })
    })

    describe('non-overlapping cases', () => {
      it('should return false when other target is completely before', () => {
        const beforeTarget = new SkipTarget({
          startTime: 5,
          endTime: 9,
        })

        // skipTarget: 10-20, beforeTarget: 5-9
        expect(skipTarget.intersects(beforeTarget)).toBe(false)
        expect(beforeTarget.intersects(skipTarget)).toBe(false)
      })

      it('should return false when other target is completely after', () => {
        const afterTarget = new SkipTarget({
          startTime: 21,
          endTime: 30,
        })

        // skipTarget: 10-20, afterTarget: 21-30
        expect(skipTarget.intersects(afterTarget)).toBe(false)
        expect(afterTarget.intersects(skipTarget)).toBe(false)
      })
    })

    describe('edge cases with decimals', () => {
      it('should handle decimal overlaps correctly', () => {
        const decimalTarget = new SkipTarget({
          startTime: 19.5,
          endTime: 25.7,
        })

        // skipTarget: 10-20, decimalTarget: 19.5-25.7
        expect(skipTarget.intersects(decimalTarget)).toBe(true)
        expect(decimalTarget.intersects(skipTarget)).toBe(true)
      })

      it('should handle very small gaps correctly', () => {
        const nearMissTarget = new SkipTarget({
          startTime: 20.1,
          endTime: 25,
        })

        // skipTarget: 10-20, nearMissTarget: 20.1-25
        expect(skipTarget.intersects(nearMissTarget)).toBe(false)
        expect(nearMissTarget.intersects(skipTarget)).toBe(false)
      })
    })

    describe('zero-duration targets', () => {
      it('should handle targets with zero duration', () => {
        const pointTarget = new SkipTarget({
          startTime: 15,
          endTime: 15,
        })

        // skipTarget: 10-20, pointTarget: 15-15
        expect(skipTarget.intersects(pointTarget)).toBe(true)
        expect(pointTarget.intersects(skipTarget)).toBe(true)
      })

      it('should handle both targets having zero duration', () => {
        const pointTarget1 = new SkipTarget({
          startTime: 15,
          endTime: 15,
        })

        const pointTarget2 = new SkipTarget({
          startTime: 15,
          endTime: 15,
        })

        expect(pointTarget1.intersects(pointTarget2)).toBe(true)
        expect(pointTarget2.intersects(pointTarget1)).toBe(true)
      })

      it('should handle non-intersecting zero-duration targets', () => {
        const pointTarget1 = new SkipTarget({
          startTime: 15,
          endTime: 15,
        })

        const pointTarget2 = new SkipTarget({
          startTime: 25,
          endTime: 25,
        })

        expect(pointTarget1.intersects(pointTarget2)).toBe(false)
        expect(pointTarget2.intersects(pointTarget1)).toBe(false)
      })
    })
  })

  describe('mergeWith', () => {
    it('should merge overlapping ranges by expanding to min start and max end', () => {
      // initial: 10-20, other: 15-25 -> result: 10-25
      const other = new SkipTarget({ startTime: 15, endTime: 25 })
      const ret = skipTarget.mergeWith(other)

      expect(ret).toBeUndefined()
      expect(skipTarget.startTime).toBe(10)
      expect(skipTarget.endTime).toBe(25)
      // other should remain unchanged
      expect(other.startTime).toBe(15)
      expect(other.endTime).toBe(25)
    })

    it('should merge touching ranges into a single continuous range', () => {
      // initial: 10-20, other: 20-30 -> result: 10-30
      const other = new SkipTarget({ startTime: 20, endTime: 30 })
      skipTarget.mergeWith(other)

      expect(skipTarget.startTime).toBe(10)
      expect(skipTarget.endTime).toBe(30)
    })

    it('should keep the same range when merging with a contained range', () => {
      // initial: 10-20, other: 12-18 -> result: 10-20
      const other = new SkipTarget({ startTime: 12, endTime: 18 })
      skipTarget.mergeWith(other)

      expect(skipTarget.startTime).toBe(10)
      expect(skipTarget.endTime).toBe(20)
    })

    it('should expand when the current range is contained within the other', () => {
      // initial: 10-20, other: 5-25 -> result: 5-25
      const other = new SkipTarget({ startTime: 5, endTime: 25 })
      skipTarget.mergeWith(other)

      expect(skipTarget.startTime).toBe(5)
      expect(skipTarget.endTime).toBe(25)
    })

    it('should merge even when ranges are disjoint (no implicit intersection check)', () => {
      // Note: mergeWith does not verify intersection; it simply takes min(start) and max(end)
      // initial: 10-20, other: 5-9 -> result: 5-20
      const before = new SkipTarget({ startTime: 5, endTime: 9 })
      skipTarget.mergeWith(before)

      expect(skipTarget.startTime).toBe(5)
      expect(skipTarget.endTime).toBe(20)

      // initial (reset): 10-20, other: 21-30 -> result: 10-30
      const fresh = new SkipTarget({ startTime: 10, endTime: 20 })
      const after = new SkipTarget({ startTime: 21, endTime: 30 })
      fresh.mergeWith(after)
      expect(fresh.startTime).toBe(10)
      expect(fresh.endTime).toBe(30)
    })

    it('should handle decimals correctly when merging', () => {
      // initial: 10-20, other: 19.5-25.7 -> result: 10-25.7
      const decimal = new SkipTarget({ startTime: 19.5, endTime: 25.7 })
      skipTarget.mergeWith(decimal)

      expect(skipTarget.startTime).toBe(10)
      expect(skipTarget.endTime).toBe(25.7)

      // disjoint with tiny gap: initial (reset): 10-20, other: 20.1-25 -> result: 10-25
      const fresh = new SkipTarget({ startTime: 10, endTime: 20 })
      const nearMiss = new SkipTarget({ startTime: 20.1, endTime: 25 })
      fresh.mergeWith(nearMiss)
      expect(fresh.startTime).toBe(10)
      expect(fresh.endTime).toBe(25)
    })

    it('should merge zero-duration ranges correctly', () => {
      // initial: 10-20, other: 15-15 -> result: 10-20
      const point = new SkipTarget({ startTime: 15, endTime: 15 })
      skipTarget.mergeWith(point)
      expect(skipTarget.startTime).toBe(10)
      expect(skipTarget.endTime).toBe(20)

      // both zero-duration at same point -> that point
      const a = new SkipTarget({ startTime: 15, endTime: 15 })
      const b = new SkipTarget({ startTime: 15, endTime: 15 })
      a.mergeWith(b)
      expect(a.startTime).toBe(15)
      expect(a.endTime).toBe(15)
    })

    it('should normalize inputs even if constructed with reversed times and then merge', () => {
      // constructor normalizes start/end, and mergeWith respects normalized bounds
      const reversed = new SkipTarget({ startTime: 30, endTime: 25 }) // normalized to 25-30
      const base = new SkipTarget({ startTime: 28, endTime: 35 })
      reversed.mergeWith(base)

      expect(reversed.startTime).toBe(25)
      expect(reversed.endTime).toBe(35)
    })
  })
})
