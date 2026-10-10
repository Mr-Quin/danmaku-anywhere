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
