import { z } from 'zod'

import { bilibiliCommentSchemaJson } from './bilibiliSchema.js'
import { customDanmakuSchema } from './custom.js'
import { danDanCommentResponseSchema } from './ddp.js'
import { wevipDanmakuSchema } from './generic.js'

export * from './bilibiliSchema.js'
export * from './custom.js'
export * from './generic.js'
export * from './ddp.js'

export const combinedDanmakuSchema = z.union([
  bilibiliCommentSchemaJson,
  customDanmakuSchema,
  wevipDanmakuSchema,
  danDanCommentResponseSchema,
])
