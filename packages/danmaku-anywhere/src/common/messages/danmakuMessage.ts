import {
  DanDanComment,
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from '@danmaku-anywhere/danmaku-engine'
import { MessageResponse, PayloadOf } from './message'
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
  | {
      action: 'danmaku/setComments'
      payload: {
        comments: DanDanComment[]
      }
    }
  | {
      action: 'danmaku/unsetComments'
      payload: undefined
    }

type DanmakuPayload<TAction> = PayloadOf<DanmakuMessage, TAction>

export const danmakuAction = {
  fetch: async (payload: DanmakuPayload<'danmaku/fetch'>) => {
    return (await chrome.runtime.sendMessage({
      action: 'danmaku/fetch',
      payload,
    })) as MessageResponse<DanDanCommentAPIResult>
  },
  delete: async (payload: DanmakuPayload<'danmaku/delete'>) => {
    return await chrome.runtime.sendMessage({
      action: 'danmaku/delete',
      payload,
    })
  },
  setComments: async (payload: DanmakuPayload<'danmaku/setComments'>) => {
    return await chrome.runtime.sendMessage({
      action: 'danmaku/setComments',
      payload,
    })
  },
  unsetComments: async () => {
    // No payload needed for this action
    return await chrome.runtime.sendMessage({
      action: 'danmaku/unsetComments',
    })
  },
}
