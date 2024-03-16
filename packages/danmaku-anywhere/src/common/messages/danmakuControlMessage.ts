import type { DanDanComment } from '@danmaku-anywhere/danmaku-engine'

import type { PayloadOf } from './message'

export type DanmakuControlMessage =
  | {
      action: 'danmakuControl/set'
      payload: {
        comments: DanDanComment[]
      }
    }
  | {
      action: 'danmakuControl/unset'
    }

type DanmakuPayload<TAction> = PayloadOf<DanmakuControlMessage, TAction>

export const danmakuControlMessage = {
  set: async (payload: DanmakuPayload<'danmakuControl/set'>) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    for (const tab of tabs) {
      console.log(tab)
      await chrome.tabs.sendMessage(tab.id as number, {
        action: 'danmakuControl/set',
        payload,
      })
    }
  },
  unset: async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    for (const tab of tabs) {
      console.log(tab)

      await chrome.tabs.sendMessage(tab.id as number, {
        action: 'danmakuControl/unset',
      })
    }
  },
}
