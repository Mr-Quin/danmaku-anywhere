import { useEffect, useRef } from 'react'

import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const urlBlacklist = ['about:blank']

export const IframeObserver = () => {
  const injectedFrames = useRef(new Set<number>()).current

  const injectScript = async (frameId: number) => {
    // ensure we only inject once
    if (injectedFrames.has(frameId)) {
      return
    }
    injectedFrames.add(frameId)

    try {
      await chromeRpcClient.injectScript(frameId)
    } catch (e) {
      Logger.error('Failed to inject script', e)
      injectedFrames.delete(frameId)
    }
  }

  const handleGetAllFrames = async () => {
    const frames = await chromeRpcClient.getAllFrames()

    frames
      .filter((frame) => {
        return !urlBlacklist.includes(frame.url)
      })
      .forEach((frame) => {
        injectScript(frame.frameId)
      })
  }

  useEffect(() => {
    void handleGetAllFrames()

    // every time a new iframe is added, get all frames and inject script
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.tagName === 'IFRAME') {
            void handleGetAllFrames()
          }
        })
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
