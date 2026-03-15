import { hexToRgb888, rgb888ToHex } from '../../utils/index'
import type { CommentOptions } from './types'
import { CommentMode } from './types'

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
