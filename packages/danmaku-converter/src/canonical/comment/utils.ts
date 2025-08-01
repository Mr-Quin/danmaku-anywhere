import { hexToRgb888, rgb888ToHex } from '../../utils/index.js'
import type { CommentOptions } from './types.js'
import { CommentMode } from './types.js'

// convert string to object
export const parseCommentEntityP = (p: string): CommentOptions => {
  const [time, mode, color, uid = ''] = p.split(',')

  if (!CommentMode[Number.parseInt(mode)]) {
    throw new Error(`Invalid mode: ${mode}`)
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
