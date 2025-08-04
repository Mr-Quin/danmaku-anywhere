export class SkipTarget {
  public commentTime: number // Time when the comment appears (seconds)
  public targetTime: number // Time to jump to (seconds)
  public text: string // Original comment text
  public timestamp: string // Parsed timestamp (mm:ss format)
  public shown: boolean // Whether button has been shown for this target

  constructor(opts: {
    commentTime: number
    targetTime: number
    text: string
    timestamp: string
    shown: boolean
  }) {
    this.commentTime = opts.commentTime
    this.targetTime = opts.targetTime
    this.text = opts.text
    this.timestamp = opts.timestamp
    this.shown = opts.shown
  }

  isInRange(time: number): boolean {
    return time >= this.commentTime && time <= this.targetTime
  }

  // check for overlap and containment, touching edges are considered intersecting
  intersects(other: SkipTarget): boolean {
    return (
      this.isInRange(other.targetTime) ||
      this.isInRange(other.commentTime) ||
      other.isInRange(this.targetTime) ||
      other.isInRange(this.commentTime)
    )
  }
}
