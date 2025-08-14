export class SkipTarget {
  // time when the jump label should appear
  public startTime: number
  // time to jump to
  public endTime: number
  public shown = false

  constructor(opts: {
    startTime: number
    endTime: number
  }) {
    this.startTime = Math.min(opts.startTime, opts.endTime)
    this.endTime = Math.max(opts.startTime, opts.endTime)
  }

  // test if time is between the target's start time and end time
  isInRange(time: number): boolean {
    return time >= this.startTime && time <= this.endTime
  }

  // Check overlap based on normalized intervals; touching edges are intersecting
  intersects(other: SkipTarget): boolean {
    return this.startTime <= other.endTime && other.startTime <= this.endTime
  }

  // Merge two intersecting targets into a new aggregated target
  // - startTime: earliest original comment time among the two
  // - endTime: latest target time among the two
  mergeWith(other: SkipTarget) {
    const startTime = Math.min(this.startTime, other.startTime)
    const endTime = Math.max(this.endTime, other.endTime)

    this.startTime = startTime
    this.endTime = endTime
  }
}
