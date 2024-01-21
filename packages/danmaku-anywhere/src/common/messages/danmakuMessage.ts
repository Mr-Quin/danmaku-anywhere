import {
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from '@danmaku-anywhere/danmaku-engine'

import { logger } from '../logger'

import { PayloadOf } from './message'

import { DanmakuMeta } from '@/common/db'

export type DanmakuMessage =
  | {
      action: 'danmaku/fetch'
      payload: {
        data: DanmakuMeta
        params?: Partial<DanDanCommentAPIParams>
        options?: {
          forceUpdate?: boolean // if false, prefer cache and fallback to remote if cache is empty
          cacheOnly?: boolean // if true, skip remote entirely and only use cache
        }
      }
    }
  | {
      action: 'danmaku/delete'
      payload: {
        episodeId: number
      }
    }

type DanmakuPayload<TAction> = PayloadOf<DanmakuMessage, TAction>

export const danmakuMessage = {
  fetch: async (payload: DanmakuPayload<'danmaku/fetch'>) => {
    logger.debug('Fetching danmaku:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'danmaku/fetch',
      payload,
    })

    if (!res.success) {
      throw new Error(res.error)
    }

    logger.debug('Fetch danmaku success', res.payload)

    return res.payload as DanDanCommentAPIResult
  },
  delete: async (payload: DanmakuPayload<'danmaku/delete'>) => {
    return await chrome.runtime.sendMessage({
      action: 'danmaku/delete',
      payload,
    })
  },
}
