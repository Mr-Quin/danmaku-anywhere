import { z } from 'zod'

import { transformV1 } from '@/common/danmaku/models/import/transformation'
import { importSchemaV1 } from '@/common/danmaku/models/import/v1'
import { importSchemaV2 } from '@/common/danmaku/models/import/v2'

export const importDanmakuSchema = z.array(
  z.union([importSchemaV1.transform(transformV1), importSchemaV2])
)
