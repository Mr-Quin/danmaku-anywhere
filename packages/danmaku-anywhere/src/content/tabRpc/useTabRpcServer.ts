import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'

import { useManualDanmaku } from './useManualDanmaku'

import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import type {
  IntegrationPolicyTestResult,
  TabMethods,
} from '@/common/rpcClient/tab/types'
import { getFirstElement, tryCatchSync } from '@/common/utils/utils'
import { parseString } from '@/content/danmaku/integration/XPathObserver'
import { useStore } from '@/content/store/store'

export const useTabRpcServer = () => {
  const { handleUnsetDanmaku, handleSetDanmaku } = useManualDanmaku()

  const handleGetDanmakuState = useEventCallback(() => {
    return {
      meta: useStore.getState().danmakuLite,
      count: useStore.getState().comments.length,
      manual: useStore.getState().manual,
    }
  })

  useEffect(() => {
    const tabRpcServer = createRpcServer<TabMethods>({
      ping: async () => true,
      danmakuMount: async (danmaku) => {
        handleSetDanmaku(danmaku)
      },
      danmakuUnmount: async () => {
        handleUnsetDanmaku()
      },
      danmakuGetState: async () => {
        return handleGetDanmakuState() ?? null
      },
      integrationPolicyTest: async ({ policy }) => {
        const titleElement = getFirstElement(policy.title.selector)
        const episodeNumberElement = getFirstElement(
          policy.episodeNumber.selector
        )
        const seasonNumberElement = getFirstElement(
          policy.seasonNumber.selector
        )
        const episodeTitleElement = getFirstElement(
          policy.episodeTitle.selector
        )

        const title = titleElement?.textContent ?? null
        const episodeNumber = episodeNumberElement?.textContent ?? null
        const seasonNumber = seasonNumberElement?.textContent ?? null
        const episodeTitle = episodeTitleElement?.textContent ?? null

        const [parsedTitle] = title
          ? tryCatchSync(() => parseString(title, policy.title.regex))
          : [null]
        const [parsedEpisodeNumber] = episodeNumber
          ? tryCatchSync(() =>
              parseString(episodeNumber, policy.episodeNumber.regex)
            )
          : [null]
        const [parsedSeasonNumber] = seasonNumber
          ? tryCatchSync(() =>
              parseString(seasonNumber, policy.seasonNumber.regex)
            )
          : [null]
        const [parsedEpisodeTitle] = episodeTitle
          ? tryCatchSync(() =>
              parseString(episodeTitle, policy.episodeTitle.regex)
            )
          : [null]

        return {
          title: {
            found: !!titleElement,
            text: title,
            parsed: parsedTitle,
          },
          episodeNumber: {
            found: !!episodeNumber,
            text: episodeNumber,
            parsed: parsedEpisodeNumber,
          },
          seasonNumber: {
            found: !!seasonNumber,
            text: seasonNumber,
            parsed: parsedSeasonNumber,
          },
          episodeTitle: {
            found: !!episodeTitle,
            text: episodeTitle,
            parsed: parsedEpisodeTitle,
          },
        } satisfies IntegrationPolicyTestResult
      },
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      tabRpcServer
        .onMessage(message, sender)
        .then(sendResponse)
        .catch(Logger.debug)
      return true
    })

    return () => {
      chrome.runtime.onMessage.removeListener(tabRpcServer.onMessage)
    }
  }, [handleSetDanmaku, handleUnsetDanmaku, handleGetDanmakuState])

  return null
}
