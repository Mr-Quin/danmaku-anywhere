export interface DanmakuFilter {
  type: 'text' | 'regex'
  value: string
  enabled: boolean
}

export interface DanmakuStyle {
  opacity: number
  fontSize: number
  fontFamily: string
}

export type FixedCommentMode = 'normal' | 'hidden' | 'scroll'

export interface DanmakuOptions {
  readonly style: DanmakuStyle
  readonly show: boolean
  readonly trackHeight: number
  /**
   * Whether to allow comments to overlap
   * @deprecated Use overlap instead
   */
  readonly allowOverlap: boolean
  readonly filters: DanmakuFilter[]
  readonly distribution: 'random' | 'order'
  /**
   * The maximum number of comments to show on the screen at the same time
   */
  readonly maxOnScreen: number
  /**
   * The interval between comment batches in milliseconds
   */
  readonly interval: number
  readonly speed: number
  /**
   * The area to show the comments in percentage
   */
  readonly area: {
    yStart: number
    yEnd: number
    xStart: number
    xEnd: number
  }
  /**
   * The maximum number of tracks
   * -1 means no limit
   */
  readonly trackLimit: number
  /**
   * The offset in milliseconds to adjust the time of the comments
   */
  readonly offset: number
  /**
   * The percentage of a comment's size that is allowed to overlap with other comments
   * 0 means no overlap, 100 means full overlap (comment size is reduced to 0), > 100 makes the size negative
   */
  readonly overlap: number
  /**
   * How to handle special comments
   */
  readonly specialComments: {
    top: FixedCommentMode
    bottom: FixedCommentMode
  }
}

export const DEFAULT_DANMAKU_OPTIONS: DanmakuOptions = {
  show: true,
  allowOverlap: false,
  overlap: 0,
  trackHeight: 32,
  filters: [],
  speed: 1,
  interval: 500,
  maxOnScreen: 500,
  trackLimit: -1,
  style: {
    opacity: 1,
    fontSize: 25,
    fontFamily: 'sans-serif',
  },
  area: {
    yStart: 0,
    yEnd: 100,
    xStart: 0,
    xEnd: 100,
  },
  specialComments: {
    top: 'normal',
    bottom: 'scroll',
  },
  offset: 0,
  distribution: 'random',
}
