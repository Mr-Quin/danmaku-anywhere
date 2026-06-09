import { hexToRgb888, rgb888ToHex } from '../../utils/index.js'
import type { CommentOptions } from './types.js'
import { CommentMode } from './types.js'

export const parseCommentGradient = (s: string) => {
  const [gr, flag] = s.split(',')
  const [start, end] = gr.split('~')
  const startHex = rgb888ToHex(Number.parseInt(start, 10))
  const endHex = rgb888ToHex(Number.parseInt(end, 10))

  return {
    start: startHex,
    end: endHex,
    stroke: flag === '0',
  }
}

// convert string to object
// returns null on an unrecognized mode so callers can drop the comment instead of throwing
export const parseCommentEntityP = (p: string): CommentOptions | null => {
  const [time, mode, color, uid = ''] = p.split(',')

  if (!CommentMode[Number.parseInt(mode)]) {
    return null
  }

  return {
    time: Number.parseFloat(time),
    mode: CommentMode[Number.parseInt(mode)] as keyof typeof CommentMode,
    color: rgb888ToHex(Number.parseInt(color)),
    uid, // uid may include string
  }
}

export const commentOptionsToString = (
  commentOptions: CommentOptions
): string => {
  const { time, mode, color, uid } = commentOptions

  let p = `${time.toFixed(2)},${CommentMode[mode]},${hexToRgb888(color)}`

  if (uid) {
    p += `,${uid}`
  }

  return p
}
