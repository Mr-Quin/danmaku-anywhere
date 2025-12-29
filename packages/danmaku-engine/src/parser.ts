import {
  type CommentEntity,
  parseCommentEntityP,
  parseCommentGradient,
} from '@danmaku-anywhere/danmaku-converter'

import type { DanmakuFilter } from './options'

// copied from danmaku
export interface ParsedComment {
  text: string
  /**
   * @default rtl
   */
  mode: 'ltr' | 'rtl' | 'top' | 'bottom'
  /**
   * Specified in seconds. Not required in live mode.
   * @default media?.currentTime
   */
  time: number
  style: Record<string, string>
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
   * Preset comments, used in media mode
   */
  comments?: ParsedComment[]
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

export const transformComment = (
  comment: CommentEntity,
  offset: number
): ParsedComment => {
  const { p, m, s } = comment
  const { time, mode, color } = parseCommentEntityP(p)
  const offsetTime = time + offset / 1000

  const parsed: ParsedComment = {
    text: m,
    mode,
    time: offsetTime,
    style: {
      color: `${color}`,
      textShadow:
        color === '00000'
          ? '-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff'
          : '-1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000',
    },
  }

  if (s) {
    try {
      const { start, end, stroke } = parseCommentGradient(s)
      parsed.style.background = `linear-gradient(to right, ${start}, ${end})`
      parsed.style.backgroundClip = 'text'
      parsed.style.webkitBackgroundClip = 'text'
      if (stroke) {
        parsed.style.webkitTextStroke = '2px transparent'
      } else {
        parsed.style.webkitTextFillColor = 'transparent'
      }
      delete parsed.style.textShadow
    } catch {
      // ignore errors
    }
  }

  return parsed
}

// returns true if the comment should be filtered out
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
  comments: CommentEntity[],
  filters: DanmakuFilter[]
) => {
  return comments.filter((comment) => {
    return !applyFilter(comment.m, filters)
  })
}
