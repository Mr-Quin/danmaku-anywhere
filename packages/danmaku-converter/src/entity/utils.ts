import { rgb888ToHex } from '../utils/index.js'

import { CommentMode } from './types.js'

// convert string to object
export const parseCommentEntityP = (p: string) => {
  const [time, mode, color, uid = ''] = p.split(',')

  if (!CommentMode[parseInt(mode)]) {
    throw new Error(`Invalid mode: ${mode}`)
  }

  return {
    time: parseFloat(time),
    mode: CommentMode[parseInt(mode)] as keyof typeof CommentMode,
    color: rgb888ToHex(parseInt(color)),
    uid, // uid may include string
  }
}
