import { describe, expect, it } from 'vitest'

import { sampleByTime, sampleFromBucket } from './iterator'

describe('sampleByTime', () => {
  it('should return an empty generator when maxPerSecond is 0', () => {
    const iterator = [1, 2, 3].values()

    const sampledIterator = sampleByTime(iterator, 0, (item) => item)
    const result = Array.from(sampledIterator)

    expect(result).toEqual([])
  })

  it('should return all items when maxPerSecond is Infinity', () => {
    const array = Array.from({ length: 1000 }, (_, i) => i + 1)
    const iterator = array.values()

    const sampledIterator = sampleByTime(
      iterator,
      Number.POSITIVE_INFINITY,
      (item) => item
    )
    const result = Array.from(sampledIterator)

    expect(result).toEqual(array)
  })

  it('should throw an error when maxPerSecond is negative', () => {
    const iterator = [].values()

    const sampledIterator = sampleByTime(iterator, -1, (item) => item)
    expect(() => sampledIterator.next()).toThrow(RangeError)
  })

  it('should sample correctly when all items are in the same second', () => {
    const array = Array.from({ length: 1000 }, (_, i) => i + 1)
    const iterator = array.values()

    const sampledIterator = sampleByTime(iterator, 2, () => 1)
    const result = Array.from(sampledIterator)

    expect(result.length).toBe(2)
    expect(new Set(result).size).toBe(2)
  })

  it('should sample correctly when items are in different seconds', () => {
    const generator = (function* () {
      yield { value: 1, time: 0 }
      yield { value: 2, time: 0 }
      yield { value: 3, time: 1 }
      yield { value: 4, time: 2 }
      yield { value: 5, time: 2 }
    })()

    const sampledIterator = sampleByTime(generator, 2, (item) => item.time)
    const result = Array.from(sampledIterator)

    expect(result.length).toBe(5) // should sample all items
    expect(result.map((item) => item.value)).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle an empty iterator gracefully', () => {
    const iterator = (function* () {})()

    const sampledIterator = sampleByTime(iterator, 2, (item) => item)
    const result = Array.from(sampledIterator)

    expect(result).toEqual([])
  })
})

describe('sampleFromBucket', () => {
  it('should return all items when limit is greater than or equal to the bucket size', () => {
    const bucket = [1, 2, 3]

    const sampledIterator = sampleFromBucket(bucket, 3)
    const result = Array.from(sampledIterator)

    expect(result).toEqual([1, 2, 3])

    const sampledIterator2 = sampleFromBucket(bucket, 5)
    const result2 = Array.from(sampledIterator2)

    expect(result2).toEqual([1, 2, 3])
  })

  it('should work with various bucket sizes', () => {
    // even and odd bucket sizes
    const buckets = [
      {
        size: 1,
        samples: 0,
      },
      {
        size: 1,
        samples: 1,
      },
      {
        size: 2,
        samples: 1,
      },
      {
        size: 5,
        samples: 3,
      },
      {
        size: 10,
        samples: 5,
      },
      {
        size: 100,
        samples: 50,
      },
      {
        size: 101,
        samples: 50,
      },
      {
        size: 500,
        samples: 250,
      },
      {
        size: 501,
        samples: 250,
      },
      {
        size: 999,
        samples: 500,
      },
      {
        size: 999,
        samples: 990,
      },
      {
        size: 1111,
        samples: 500,
      },
      {
        size: 62345,
        samples: 6000,
      },
    ]

    for (const { size, samples } of buckets) {
      const bucket = Array.from({ length: size }, (_, i) => i + 1)
      const sampledIterator = sampleFromBucket(bucket, samples)
      const result = Array.from(sampledIterator)

      // should have the correct number of samples
      expect(result).toHaveLength(samples)

      // should have no duplicates
      expect(new Set(result).size).toBe(samples)

      // should stay sorted
      expect(result.toSorted((a, b) => a - b)).toEqual(result)
    }
  })

  it('should sample evenly when possible', () => {
    const calculateStats = (arr: number[]) => {
      const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length
      const variance =
        arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length

      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
      }
    }

    const length = 999
    const bucket = Array.from({ length: length }, (_, i) => i + 1)

    for (let i = 300; i < 999; i++) {
      const sampleSize = i
      const sampledIterator = sampleFromBucket(bucket, sampleSize)
      const result = Array.from(sampledIterator)

      expect(result.length).toBe(sampleSize)
      // sampled result should be sorted
      expect(result.toSorted((a, b) => a - b)).toEqual(result)

      const sampleStats = calculateStats(result)
      const bucketStats = calculateStats(bucket)

      // expect std deviation to be close to the bucket std deviation
      expect(Math.abs(sampleStats.mean - bucketStats.mean)).toBeLessThan(2)
    }
  })

  it('should sample with randomness', () => {
    const bucket = Array.from({ length: 1000 }, (_, i) => i + 1)

    // randomness increases when sample size is small
    const sampleSize = 5

    // test 10 times, only needs to pass once, to reduce the chance of collision
    for (let i = 0; i < 10; i++) {
      const generator1 = sampleFromBucket(bucket, sampleSize)
      const generator2 = sampleFromBucket(bucket, sampleSize)

      const sample1 = Array.from(generator1)
      const sample2 = Array.from(generator2)

      try {
        // if the samples are different, consider it a success and break the loop
        expect(sample1).not.toEqual(sample2)
        break
      } catch (e) {
        // throw error on the last iteration
        if (i === 9) {
          throw e
        }
      }
    }
  })

  it('should handle an empty bucket', () => {
    const bucket: number[] = []

    const sampledIterator = sampleFromBucket(bucket, 2)
    const result = Array.from(sampledIterator)

    expect(result).toEqual([])
  })
})
