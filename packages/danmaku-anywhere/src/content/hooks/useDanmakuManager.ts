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

  const { toast } = useToast()

  useEffect(() => {
    if (!options || !container || !node || !mountConfig) return

    if (danmakuEngine.created) return

    if (status === 'playing' && comments.length > 0) {
      logger.debug('Creating danmaku', options)
      toast.success(
        `Danmaku mounted: ${mediaInfo?.title} E${mediaInfo?.episode} (${comments.length})`
      )
      danmakuEngine.create(container, node, comments, options)
    }
  }, [container, node, comments, options, status, mountConfig])

  useEffect(() => {
    if (!danmakuEngine.created || !options) return

    logger.debug('Updating danmaku config', options)
    danmakuEngine.updateConfig(options)
  }, [options])

  useEffect(() => {
    if (status === 'stopped') {
      logger.debug('Destroying danmaku')
      danmakuEngine.destroy()
    }
  }, [status])

  useEffect(() => {
    logger.debug({
      comments: comments.length,
      node,
      container,
      danmakuEngine,
      mountConfig,
      status,
    })
  }, [container, node, comments])

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
