import { z } from 'zod'

import { bilibiliSchema } from './bilibiliSchema.js'
import { customDanmakuSchema } from './custom.js'
import { wevipSchema } from './generic.js'

export const danmakuConverterSchema = z.union([
  bilibiliSchema,
  customDanmakuSchema,
  wevipSchema,
])
