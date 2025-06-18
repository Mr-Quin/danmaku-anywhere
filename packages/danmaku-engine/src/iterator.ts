// takes an iterator and applies a function to each element, returns an iterator
export function* mapIter<T, U>(iter: Iterable<T>, fn: (value: T) => U) {
  for (const value of iter) {
    yield fn(value)
  }
}

export function* sampleByTime<T>(
  iterator: Iterator<T>,
  maxPerSecond: number,
  getTime: (item: T) => number
): Generator<T> {
  if (maxPerSecond < 0) throw new RangeError('maxPerSecond must be positive')

  // if maxPerSecond is 0, return an empty generator
  if (maxPerSecond === 0) return

  // if maxPerSecond is Infinity, just return all comments
  if (maxPerSecond === Number.POSITIVE_INFINITY) {
    while (true) {
      const next = iterator.next()
      if (next.done) return
      yield next.value
    }
  }

  let currentBucket = []
  let currentBucketStartTime = null
  let nextItem = iterator.next()

  while (!nextItem.done) {
    const item = nextItem.value

    if (currentBucketStartTime === null) {
      currentBucketStartTime = getTime(item)
    }

    // after we have collected all comments in the current second
    // yield a sample of them
    if (getTime(item) >= currentBucketStartTime + 1) {
      yield* sampleFromBucket(currentBucket, maxPerSecond)
      currentBucket = []
      currentBucketStartTime = getTime(item)
    }

    // consume all items in the same second
    currentBucket.push(item)
    nextItem = iterator.next()
  }

  if (currentBucket.length > 0) {
    // yield the remaining comments
    yield* sampleFromBucket(currentBucket, maxPerSecond)
  }
}

export function* sampleFromBucket<T>(bucket: T[], limit: number): Generator<T> {
  if (limit >= bucket.length) {
    for (const item of bucket) {
      yield item
    }
    return
  }

  if (limit === 0) return

  const interval = bucket.length / limit
  let i = Math.random() * interval

  while (i < bucket.length) {
    yield bucket[Math.floor(i)]
    i += interval
  }
}
