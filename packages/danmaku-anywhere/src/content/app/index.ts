import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import {
  createExtResponse,
  DA_EXT_SOURCE_APP,
  DA_EXT_SOURCE_CONTENT,
  type ExtMessage,
  type ExtRequest,
  type ExtResponse,
  setExtensionAttr,
} from '@danmaku-anywhere/web-scraper'
import { EXTENSION_VERSION } from '@/common/constants'
import { isProvider } from '@/common/danmaku/utils'
import { uiContainer } from '@/common/ioc/uiIoc'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { portNames } from '@/common/ports/portNames'
import type { RPCClientResponse } from '@/common/rpc/client'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

import { tryCatch } from '@/common/utils/tryCatch'

const extensionOptionsService = uiContainer.get(ExtensionOptionsService)

extensionOptionsService.get().then((options) => {
  setExtensionAttr({
    version: EXTENSION_VERSION,
    id: options.id,
  })
})

const sendResponse = (message: ExtResponse) => {
  window.postMessage(message, window.origin)
}

const createRpcWrapper =
  (message: ExtRequest) =>
  async <T extends RPCClientResponse<any>>(fn: () => Promise<T>) => {
    const [res, err] = await tryCatch(fn)
    if (err) {
      return sendResponse(
        createExtResponse({
          source: DA_EXT_SOURCE_CONTENT,
          action: message.action,
          success: false,
          isLast: true,
          err: err.message,
          id: message.id,
        })
      )
    }
    return sendResponse(
      createExtResponse({
        source: DA_EXT_SOURCE_CONTENT,
        action: message.action,
        success: true,
        isLast: true,
        data: res?.data,
        id: message.id,
      })
    )
  }

window.addEventListener(
  'message',
  async (event: MessageEvent<ExtMessage>): Promise<void> => {
    if (event.data?.source !== DA_EXT_SOURCE_APP) return
    if (event.data?.type === 'response') return

    const request = event.data

    const wrapRpc = createRpcWrapper(request)

    switch (request.action) {
      case 'kazumiSearch': {
        return wrapRpc(() => chromeRpcClient.kazumiSearchContent(request.data))
      }
      case 'kazumiGetChapters': {
        return wrapRpc(() => chromeRpcClient.kazumiGetChapters(request.data))
      }
      case 'extractMedia': {
        const port = chrome.runtime.connect({ name: portNames.extractMedia })

        // relay messages to window
        port.onMessage.addListener((response) => {
          sendResponse(
            createExtResponse({
              ...response,
              id: request.id,
              source: DA_EXT_SOURCE_CONTENT,
            })
          )
        })

        port.onDisconnect.addListener(() => {
          // if disconnect happens after the message is completed, this message will be ignored
          sendResponse(
            createExtResponse({
              action: request.action,
              success: false,
              err: 'port disconnected',
              isLast: true,
              id: request.id,
              source: DA_EXT_SOURCE_CONTENT,
            })
          )
        })

        // initial message to start the process
        port.postMessage({
          action: 'extractMedia',
          data: request.data,
        })

        return
      }
      case 'episodeGetAll': {
        try {
          const custom = await chromeRpcClient.episodeFilterCustomLite({
            all: true,
          })
          const episodes = await chromeRpcClient.episodeFilterLite({
            all: true,
          })
          return sendResponse(
            createExtResponse({
              action: request.action,
              success: true,
              data: [...episodes.data, ...custom.data],
              isLast: true,
              source: DA_EXT_SOURCE_CONTENT,
              id: request.id,
            })
          )
        } catch (err) {
          if (err instanceof Error) {
            return sendResponse(
              createExtResponse({
                source: DA_EXT_SOURCE_CONTENT,
                id: request.id,
                action: request.action,
                isLast: true,
                success: false,
                err: err.message,
              })
            )
          }
          return
        }
      }
      case 'danmakuGet': {
        const data = request.data
        const { id } = data
        if (isProvider(data, DanmakuSourceType.MacCMS)) {
          return wrapRpc(() =>
            chromeRpcClient.episodeFilterCustom({
              id,
            })
          )
        }
        return wrapRpc(() =>
          chromeRpcClient.episodeFilter({
            id,
          })
        )
      }
      case 'setRequestHeaders': {
        return wrapRpc(() => chromeRpcClient.setHeaders(request.data))
      }
    }
  }
)
