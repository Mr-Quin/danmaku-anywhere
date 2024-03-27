import type { DanDanComment } from '@danmaku-anywhere/dandanplay-api'
import { DanDanCommentMode } from '@danmaku-anywhere/dandanplay-api'

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

export const parseDanDanCommentParams = (p: string) => {
  const [time, mode, color, uid] = p.split(',')

  return {
    time: parseFloat(time),
    mode: DanDanCommentMode[parseInt(mode)],
    color: `#${`000000${parseInt(color).toString(16)}`.slice(-6)}`,
    uid: parseInt(uid),
  }
}

export interface DanmakuStyle {
  opacity: number
  fontSize: number
  fontFamily: string
}

// transform danmaku comments to a format understood by danmaku engine
export const transformDanDanComments = (
  comments: DanDanComment[],
  style: DanmakuStyle
) => {
  return comments.map((comment) => {
    const { p, m } = comment
    const { time, mode, color } = parseDanDanCommentParams(p)

    return {
      text: m,
      mode,
      time,
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
export function* sampleComments(comments: DanDanComment[], ratio: number) {
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
