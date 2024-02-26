import type {
  DanDanComment,
  DanmakuManager,
} from '@danmaku-anywhere/danmaku-engine'
import { useEventCallback } from '@mui/material'
import { useEffect } from 'react'

import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import type { DanmakuControlMessage } from '@/common/messages/danmakuControlMessage'
import { Logger } from '@/common/services/Logger'

// listen to comment changes and mount/unmount the danmaku engine
export const useManualDanmaku = (
  danmakuEngine: DanmakuManager,
  videoNode: HTMLVideoElement | null,
  container: HTMLElement | null
) => {
  const { data: options } = useDanmakuOptions()

  const handleSetDanmaku = useEventCallback((comments: DanDanComment[]) => {
    if (!container || !videoNode) {
      Logger.debug('Container or node is not ready')
      return
    }

    Logger.debug('Creating danmaku')

    danmakuEngine.create(container, videoNode, comments, options)
  })

  const handleUnsetDanmaku = useEventCallback(() => {
    if (!danmakuEngine.created) {
      Logger.debug('Danmaku is not created')
      return
    }

    Logger.debug(`Unloading danmaku`)
    danmakuEngine.destroy()
  })

  useEffect(() => {
    const listener = (request: DanmakuControlMessage) => {
      if (request.action === 'danmakuControl/set') {
        handleSetDanmaku(request.payload.comments)
      }

      if (request.action === 'danmakuControl/unset') {
        handleUnsetDanmaku()
      }
    }

    chrome.runtime.onMessage.addListener(listener)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [handleSetDanmaku, handleUnsetDanmaku])

  return null
}
