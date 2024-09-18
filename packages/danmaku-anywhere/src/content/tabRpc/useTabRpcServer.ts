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
import { parseMediaInfo } from '@/content/danmaku/integration/observers/IntegrationPolicyObserver'
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
        const episodeElement = getFirstElement(policy.episode.selector)
        const seasonElement = getFirstElement(policy.season.selector)
        const episodeTitleElement = getFirstElement(
          policy.episodeTitle.selector
        )

        Logger.debug({
          titleElement,
          episodeElement,
          seasonElement,
          episodeTitleElement,
        })

        const title = titleElement?.textContent ?? null
        const episode = episodeElement?.textContent ?? null
        const season = seasonElement?.textContent ?? null
        const episodeTitle = episodeTitleElement?.textContent ?? null

        const [mediaInfo, parseErr] = tryCatchSync(() =>
          parseMediaInfo(
            {
              title,
              episode,
              season,
              episodeTitle: episodeTitle,
            },
            policy
          )
        )

        if (parseErr) {
          return {
            error: true,
            message: parseErr.message,
          } satisfies IntegrationPolicyTestResult
        }

        return {
          error: false,
          foundTitle: titleElement !== null,
          foundEpisode: episodeElement !== null,
          foundSeason: seasonElement !== null,
          foundEpisodeTitle: episodeTitleElement !== null,
          mediaInfo: mediaInfo,
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
