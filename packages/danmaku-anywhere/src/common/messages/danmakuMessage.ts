import type {
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from '@danmaku-anywhere/dandanplay-api'

import { Logger } from '../services/Logger'

import type { PayloadOf } from './message'

import type {
  DanmakuCache,
  DanmakuCacheLite,
  DanmakuMeta,
} from '@/common/db/db'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'

export type DanmakuMessage =
  | {
      action: 'danmaku/fetch'
      payload: {
        data: DanmakuMeta
        params?: Partial<DanDanCommentAPIParams>
        options?: DanmakuFetchOptions
      }
    }
  | {
      action: 'danmaku/delete'
      payload: {
        episodeId: number
      }
    }
  | {
      action: 'danmaku/getAll'
    }
  | {
      action: 'danmaku/getAllLite'
    }
  | {
      action: 'danmaku/getByEpisodeId'
      payload: {
        episodeId: number
      }
    }

type DanmakuPayload<TAction> = PayloadOf<DanmakuMessage, TAction>

export const danmakuMessage = {
  fetch: async (payload: DanmakuPayload<'danmaku/fetch'>) => {
    Logger.debug('Fetching danmaku:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'danmaku/fetch',
      payload,
    })

    if (!res.success) {
      throw new Error(res.error)
    }

    Logger.debug('Fetch danmaku success', res.payload)

    return res.payload as DanDanCommentAPIResult
  },
  delete: async (payload: DanmakuPayload<'danmaku/delete'>) => {
    return await chrome.runtime.sendMessage({
      action: 'danmaku/delete',
      payload,
    })
  },
  getAll: async (payload: DanmakuPayload<'danmaku/getAll'>) => {
    const res = await chrome.runtime.sendMessage({
      action: 'danmaku/getAll',
      payload: payload ?? {},
    })

    Logger.debug(`Get all danmaku: ${res.payload.length} records`)

    return res.payload as DanmakuCache[]
  },
  getAllLite: async (payload: DanmakuPayload<'danmaku/getAllLite'>) => {
    const res = await chrome.runtime.sendMessage({
      action: 'danmaku/getAllLite',
      payload: payload ?? {},
    })

    Logger.debug(`Get all danmaku: ${res.payload.length} records`)

    return res.payload as DanmakuCacheLite[]
  },
  getByEpisodeId: async (payload: DanmakuPayload<'danmaku/getByEpisodeId'>) => {
    const res = await chrome.runtime.sendMessage({
      action: 'danmaku/getByEpisodeId',
      payload: payload,
    })

    Logger.debug(`Get danmaku by id: ${res.payload} `)

    return (res.payload || null) as DanmakuCache | null
  },
}
