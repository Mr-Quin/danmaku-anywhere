import { DanDanCommentMode } from '@danmaku-anywhere/dandanplay-api'

import type { DanmakuFilter } from './DanmakuManager'

// copied from danmaku
export interface Comment {
  text?: string
  /**
   * @default rtl
   */
  mode?: 'ltr' | 'rtl' | 'top' | 'bottom'
  /**
   * Specified in seconds. Not required in live mode.
   * @default media?.currentTime
   */
  time?: number
  style?: Partial<CSSStyleDeclaration> | CanvasRenderingContext2D

  /**
   * A custom render to draw comment.
   * When it exist, `text` and `style` will be ignored.
   */
  render?(): HTMLElement | HTMLCanvasElement
}

export interface CachedComment {
  /**
   * Comment id
   * Undefined for imported comments
   */
  cid?: number
  /**
   * Comma separated string in format of `time,mode,color,uid`
   * Uid may be a string
   * Uid may not be provided
   */
  p: string
  /**
   * Comment text
   */
  m: string
}

export interface DanmakuOption {
  /**
   * The stage to display comments will be appended to container.
   */
  container: HTMLElement
  /**
   * If it's not provided, Danmaku will be in live mode.
   */
  media?: HTMLMediaElement
  /**
   * Preseted comments, used in media mode
   */
  comments?: Comment[]
  /**
   * Canvas engine may more efficient than DOM however it costs more memory.
   * @default dom
   */
  // engine?: 'dom' | 'canvas'
  /**
   * The speed of comments in `ltr` and `rtl` mode.
   */
  speed?: number
}

export const decodeColor = (color: number) => {
  return `#${`000000${color.toString(16)}`.slice(-6)}`
}

export const encodeColor = (hexColor: string) => {
  return parseInt(hexColor.replace('#', '0x'))
}

export const parseDanDanCommentParams = (p: string) => {
  const [time, mode, color, uid = ''] = p.split(',')

  return {
    time: parseFloat(time),
    mode: DanDanCommentMode[parseInt(mode)],
    color: decodeColor(parseInt(color)),
    uid, // uid may include string
  }
}

export interface DanmakuStyle {
  opacity: number
  fontSize: number
  fontFamily: string
}

// transform danmaku comments to a format understood by danmaku engine
export const transformDanDanComments = (
  comments: CachedComment[],
  style: DanmakuStyle,
  offset: number
) => {
  return comments.map((comment) => {
    const { p, m } = comment
    const { time, mode, color } = parseDanDanCommentParams(p)
    const offsetTime = time + offset / 1000

    return {
      text: m,
      mode,
      time: offsetTime,
      style: {
        fontSize: `${style.fontSize}px`,
        color: `${color}`,
        opacity: `${style.opacity}`,
        textShadow:
          color === '00000'
            ? '-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff'
            : '-1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000',
        fontFamily: `${style.fontFamily}`,
      },
    }
  }) as Comment[]
}

// ratio is a number between 0 and 1 where 0 means we keep 0% of the comments
// and 1 means we keep 100% of the comments
export function* sampleComments(comments: CachedComment[], ratio: number) {
  if (ratio < 0 || ratio > 1) throw new Error('ratio must be between 0 and 1')

  const length = comments.length
  const filteredLength = Math.floor(length * ratio)

  if (ratio === 0 || length === 0 || filteredLength === 0) return

  if (ratio === 1) {
    yield* comments
    return
  }

  const gap = Math.ceil(length / filteredLength)

  // evenly sample comments, assuming they are sorted by time
  for (let i = 0; i < filteredLength && i * gap < length; i++) {
    yield comments[i * gap]
  }
}

// returns true if the comment should be be filtered out
export const applyFilter = (comment: string, filters: DanmakuFilter[]) => {
  return filters.some(({ type, value, enabled }) => {
    if (!enabled) return false

    switch (type) {
      case 'text':
        return comment.includes(value)
      case 'regex':
        return new RegExp(value).test(comment)
    }
  })
}

export const filterComments = (
  comments: CachedComment[],
  filters: DanmakuFilter[]
) => {
  return comments.filter((comment) => {
    return !applyFilter(comment.m, filters)
  })
}
