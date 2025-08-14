export class SkipTarget {
  // time when the jump label should appear
  public startTime: number
  // time to jump to
  public endTime: number
  public text: string
  public timestamp: string
  public shown = false
  public dismissed = false

  constructor(opts: {
    startTime: number
    endTime: number
    text: string
    timestamp: string
  }) {
    this.startTime = opts.startTime
    this.endTime = opts.endTime
    this.text = opts.text
    this.timestamp = opts.timestamp
  }

  // test if time is between the target's start time and end time
  isInRange(time: number): boolean {
    return time >= this.startTime && time <= this.endTime
  }

  // check for overlap and containment, touching edges are considered intersecting
  intersects(other: SkipTarget): boolean {
    return (
      this.isInRange(other.endTime) ||
      this.isInRange(other.startTime) ||
      other.isInRange(this.endTime) ||
      other.isInRange(this.startTime)
    )
  }
}
