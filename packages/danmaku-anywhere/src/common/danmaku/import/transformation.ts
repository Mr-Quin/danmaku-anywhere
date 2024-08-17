import type { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { importSchemaV1 } from '@/common/danmaku/import/v1'
import type { importSchemaV2 } from '@/common/danmaku/import/v2'
import type { DanmakuInsert } from '@/common/danmaku/models/danmaku'
import { CURRENT_SCHEMA_VERSION } from '@/common/danmaku/utils'

export function transformV1(
  v1Data: z.infer<typeof importSchemaV1>
): DanmakuInsert {
  if (v1Data.type === DanmakuSourceType.DanDanPlay) {
    return {
      provider: v1Data.type,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      params: v1Data.params,
      meta: {
        provider: v1Data.meta.type,
        ...v1Data.meta,
        episodeTitle:
          v1Data.meta.episodeTitle ?? v1Data.meta.episodeId.toString(),
      },
      episodeTitle: v1Data.meta.episodeTitle ?? v1Data.meta.animeTitle,
      seasonTitle: v1Data.meta.animeTitle,
      episodeId: v1Data.meta.episodeId,
      seasonId: v1Data.meta.animeId,
    }
  } else if (v1Data.type === DanmakuSourceType.Custom) {
    return {
      provider: v1Data.type,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      meta: {
        provider: v1Data.meta.type,
        seasonTitle: v1Data.meta.animeTitle, // Rename animeTitle to seasonTitle
        episodeTitle:
          v1Data.meta.episodeTitle ?? v1Data.meta.episodeNumber!.toString(),
      },
      episodeTitle:
        v1Data.meta.episodeTitle ?? v1Data.meta.episodeNumber!.toString(),
      seasonTitle: v1Data.meta.animeTitle,
    }
  } else {
    throw new Error('Unsupported data type')
  }
}

export function transformV2(
  v1Data: z.infer<typeof importSchemaV2>
): DanmakuInsert {
  return v1Data
}
