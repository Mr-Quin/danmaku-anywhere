import { useDanmakuEngine } from '@danmaku-anywhere/danmaku-engine'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useToast } from '../store/toastStore'
import { useStore } from '../store/store'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { logger } from '@/common/logger'
import { useNodeMonitor } from '@/content/hooks/useNodeMonitor'
import { DanmakuControlMessage } from '@/common/messages/danmakuControlMessage'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = () => {
  const mountConfig = useMatchMountConfig(window.location.href)

  const { data: options } = useDanmakuOptions()

  const { comments, setComments, mediaInfo, status } = useStore(
    useShallow(({ comments, setComments, mediaInfo, status }) => {
      return { comments, setComments, mediaInfo, status }
    })
  )

  const container = useNodeMonitor(mountConfig?.containerQuery)
  const node = useNodeMonitor<HTMLVideoElement>(mountConfig?.mediaQuery)

  const danmakuEngine = useDanmakuEngine()

  useEffect(() => {
    if (!options || !container || !node) return

    if (danmakuEngine.created) return

    if (status === 'playing') {
      logger.debug('Creating danmaku', options)
      danmakuEngine.create(container, node, comments, options)
    }
  }, [container, node, comments, options, status])

  const { toast } = useToast()

  useEffect(() => {
    logger.debug({
      comments: comments.length,
      node,
      container,
      danmakuEngine,
      mountConfig,
    })
  }, [container, node, comments])

  useEffect(() => {
    if (!mountConfig) return

    if (comments.length > 0) {
      toast.success(
        `Danmaku mounted: ${mediaInfo?.title} E${mediaInfo?.episode} (${comments.length})`
      )
    }
  }, [comments])

  useEffect(() => {
    if (status === 'stopped') {
      logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
    }
  }, [status])

  useEffect(() => {
    const listener = (request: DanmakuControlMessage) => {
      if (request.action === 'danmakuControl/set') {
        logger.debug('received message', request)
        setComments(request.payload.comments)
      }
      if (request.action === 'danmakuControl/unset') {
        logger.debug('received message', request)
        setComments([])
        danmakuEngine.destroy()
      }
    }

    chrome.runtime.onMessage.addListener(listener)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [danmakuEngine])

  return null
}
