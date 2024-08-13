import type { z } from 'zod'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuInsert } from '@/common/danmaku/models/danmakuCache/db'
import type { importSchemaV1 } from '@/common/danmaku/models/import/v1'

export function transformV1(
  v1Data: z.infer<typeof importSchemaV1>
): DanmakuInsert {
  if (v1Data.type === DanmakuSourceType.DDP) {
    return {
      provider: v1Data.type,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: v1Data.schemaVersion,
      params: v1Data.params,
      meta: {
        provider: v1Data.meta.type,
        episodeId: v1Data.meta.episodeId,
        seasonId: v1Data.meta.animeId, // Rename animeId to seasonId
        episodeTitle: v1Data.meta.episodeTitle,
        seasonTitle: v1Data.meta.animeTitle, // Rename animeTitle to seasonTitle
      },
    }
  } else if (v1Data.type === DanmakuSourceType.Custom) {
    return {
      provider: v1Data.type,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: v1Data.schemaVersion,
      meta: {
        provider: v1Data.meta.type,
        seasonTitle: v1Data.meta.animeTitle, // Rename animeTitle to seasonTitle
        episodeTitle: v1Data.meta.episodeTitle,
        episodeNumber: v1Data.meta.episodeNumber,
      },
    }
  } else {
    throw new Error('Unsupported data type')
  }
}
