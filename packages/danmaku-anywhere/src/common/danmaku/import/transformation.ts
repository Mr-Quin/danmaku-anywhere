import type { z } from 'zod'

import { CURRENT_SCHEMA_VERSION } from '@/common/danmaku/constants'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { importSchemaV1 } from '@/common/danmaku/import/v1'
import type { importSchemaV2 } from '@/common/danmaku/import/v2'
import type { importSchemaV3 } from '@/common/danmaku/import/v3'
import type { DanmakuInsert } from '@/common/danmaku/models/danmaku'

export function transformV1(
  v1Data: z.infer<typeof importSchemaV1>
): DanmakuInsert {
  if (v1Data.type === 1) {
    // DanDanPlay
    return {
      provider: DanmakuSourceType.DanDanPlay,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      params: v1Data.params,
      meta: {
        provider: DanmakuSourceType.DanDanPlay,
        ...v1Data.meta,
        episodeTitle:
          v1Data.meta.episodeTitle ?? v1Data.meta.episodeId.toString(),
      },
      episodeTitle: v1Data.meta.episodeTitle ?? v1Data.meta.animeTitle,
      seasonTitle: v1Data.meta.animeTitle,
      episodeId: v1Data.meta.episodeId,
      seasonId: v1Data.meta.animeId,
    }
  } else if (v1Data.type === 0) {
    // Custom
    return {
      provider: DanmakuSourceType.Custom,
      comments: v1Data.comments,
      commentCount: v1Data.comments.length,
      version: v1Data.version,
      timeUpdated: v1Data.timeUpdated,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      meta: {
        provider: DanmakuSourceType.Custom,
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
  v2Data: z.infer<typeof importSchemaV2>
): DanmakuInsert {
  if (v2Data.provider === 0) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Custom,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Custom,
      },
    }
  } else if (v2Data.provider === 1) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.DanDanPlay,
      params: v2Data.params ?? {},
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.DanDanPlay,
      },
    }
  } else if (v2Data.provider === 2) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Bilibili,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Bilibili,
      },
    }
  } else if (v2Data.provider === 3) {
    return {
      ...v2Data,
      provider: DanmakuSourceType.Tencent,
      meta: {
        ...v2Data.meta,
        provider: DanmakuSourceType.Tencent,
      },
    }
  }
  return v2Data
}

export function transformV3(
  v3Data: z.infer<typeof importSchemaV3>
): DanmakuInsert {
  if (v3Data.provider === 'DanDanPlay') {
    return {
      ...v3Data,
      params: v3Data.params ?? {},
    }
  }
  return v3Data
}
