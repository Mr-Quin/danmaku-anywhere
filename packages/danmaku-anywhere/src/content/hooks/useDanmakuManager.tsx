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

  const { comments, setComments, mediaInfo } = useStore(
    useShallow(({ comments, setComments, mediaInfo }) => {
      return { comments, setComments, mediaInfo }
    })
  )

  const container = useNodeMonitor(mountConfig?.containerQuery)
  const node = useNodeMonitor<HTMLVideoElement>(mountConfig?.mediaQuery)

  const danmakuEngine = useDanmakuEngine()

  useEffect(() => {
    if (!options || !container || !node) return
    logger.debug('Creating danmaku', options)
    danmakuEngine.create(container, node, comments, options)

    return () => {
      danmakuEngine.destroy()
    }
  }, [container, node, comments, options])

  const { toast } = useToast((state) => state)

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
    } else {
      toast.info(`Danmaku unmounted`)
    }
  }, [comments])

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
