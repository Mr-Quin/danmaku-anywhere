import {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'
import { DanmakuMeta } from '@/common/db'

interface Message {
  action: string
  payload?: any
}

interface MessageSuccessResponse<T = any> {
  type: 'success'
  payload: T
}

interface MessageErrorResponse {
  type: 'error'
  payload: string
}

type MessageResponse<T = any> = MessageSuccessResponse<T> | MessageErrorResponse

export type DanmakuMessage =
  | {
      action: 'danmaku/fetch'
      payload: {
        data: DanmakuMeta
        params?: Partial<DanDanCommentAPIParams>
        options?: { forceUpdate?: boolean; cacheOnly?: boolean }
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
    }

type MessageListener<T> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: <R>(response: MessageResponse<R>) => void
) => void

type MessageOf<M extends Message, A> = Extract<M, { action: A }>

export const createMessageBus = <T extends Message>() => {
  const listeners: Map<string, MessageListener<T>[]> = new Map()

  const sendMessage = chrome.runtime.sendMessage
  const onMessage = chrome.runtime.onMessage
  const tabQuery = chrome.tabs.query

  const handleMessage = (
    message: T,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    const messageListeners = listeners.get(message.action)
    if (messageListeners) {
      for (const listener of messageListeners) {
        listener(message, sender, sendResponse)
      }
    }
    return true
  }

  onMessage.addListener(handleMessage)

  const publish = async <R>(message: T): Promise<MessageResponse<R>> => {
    return sendMessage(message)
  }

  const subscribe = <K extends string>(
    action: K,
    listener: MessageListener<MessageOf<T, K>>
  ) => {
    const messageListeners = listeners.get(action) || []
    messageListeners.push(listener as any)
    listeners.set(action, messageListeners)
  }

  const unsubscribe = <K extends string>(
    action: K,
    listener: MessageListener<MessageOf<T, K>>
  ) => {
    const messageListeners = listeners.get(action) || []
    const index = messageListeners.indexOf(listener as any)
    if (index !== -1) {
      messageListeners.splice(index, 1)
      listeners.set(action, messageListeners)
    }
  }

  const queryTabs = async <R>(
    message: T,
    queryInfo: chrome.tabs.QueryInfo = {}
  ): Promise<MessageResponse<R>[]> => {
    const tabs = await tabQuery(queryInfo)

    const promises = tabs.map((tab) => {
      return new Promise<MessageResponse<R>>((resolve) => {
        chrome.tabs.sendMessage(tab.id as number, message, (response) => {
          resolve(response)
        })
      })
    })

    const results = await Promise.all(promises)

    return results
  }

  return { publish, subscribe, unsubscribe, queryTabs }
}

export const createDanmakuAction = (action: DanmakuMessage) => {
  return action
}
