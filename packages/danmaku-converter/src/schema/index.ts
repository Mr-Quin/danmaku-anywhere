import { z } from 'zod'
import { bilibiliSchema } from './bilibiliSchema'
import { customDanmakuSchema } from './custom'
import { wevipSchema } from './generic'

export const danmakuConverterSchema = z.union([
  bilibiliSchema,
  customDanmakuSchema,
  wevipSchema,
])
