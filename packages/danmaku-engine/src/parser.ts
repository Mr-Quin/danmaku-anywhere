import {
  type CommentEntity,
  parseCommentEntityP,
  parseCommentGradient,
} from '@danmaku-anywhere/danmaku-converter'

import type { DanmakuFilter, DedupConfig } from './options'

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
  color: string
  gradient?: {
    start: string
    end: string
    stroke: boolean
  }
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
    style: {},
    color,
  }

  if (s) {
    try {
      const { start, end, stroke } = parseCommentGradient(s)
      parsed.gradient = { start, end, stroke }
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

export function dedupComments(
  comments: CommentEntity[],
  config: DedupConfig
): CommentEntity[] {
  if (!config.enabled) {
    return comments
  }

  if (comments.length <= 1) {
    return comments
  }

  // Create index pairs so we can sort by time but restore to mark kept/dropped
  const indexed = comments.map((c, i) => ({
    comment: c,
    time: parseCommentEntityP(c.p).time,
    originalIndex: i,
  }))

  // Stable sort by time
  indexed.sort((a, b) => a.time - b.time)

  // Track which original indices are kept
  const kept = new Set<number>()
  const lastKeptTime = new Map<string, number>()

  for (const { comment, time, originalIndex } of indexed) {
    // Check if whitelisted (exempt from dedup)
    if (applyFilter(comment.m, config.whitelist)) {
      kept.add(originalIndex)
      continue
    }

    const prev = lastKeptTime.get(comment.m)
    if (prev !== undefined && Math.abs(time - prev) <= config.tolerance) {
      // Duplicate within tolerance — drop
      continue
    }

    // Keep this comment
    kept.add(originalIndex)
    lastKeptTime.set(comment.m, time)
  }

  // Preserve original order
  return comments.filter((_, i) => kept.has(i))
}
