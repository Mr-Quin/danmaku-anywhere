import Danmaku from 'danmaku'
import { DanDanComment, DanDanCommentMode } from './api'

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

export const createDanmakuEngine = (opts: DanmakuOption) => {
  return new Danmaku(opts)
}
