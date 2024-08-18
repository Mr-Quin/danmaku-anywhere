import { z } from 'zod'

import {
  transformV1,
  transformV2,
} from '@/common/danmaku/import/transformation'
import { importSchemaV1 } from '@/common/danmaku/import/v1'
import { importSchemaV2 } from '@/common/danmaku/import/v2'

const importSchema = z.union([
  importSchemaV1.transform(transformV1),
  importSchemaV2.transform(transformV2),
])

export const importDanmakuSchema = z.preprocess((data) => {
  // Ignore invalid data
  const r = z.array(z.any()).parse(data)
  return r.filter((d) => importSchema.safeParse(d).success)
}, z.array(importSchema))
