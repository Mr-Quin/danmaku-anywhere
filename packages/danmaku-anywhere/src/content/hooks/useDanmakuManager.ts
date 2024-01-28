import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../store/store'
import { useToast } from '../store/toastStore'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { DanmakuControlMessage } from '@/common/messages/danmakuControlMessage'
import { Logger } from '@/common/services/Logger'
import { useNodeMonitor } from '@/content/hooks/useNodeMonitor'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = () => {
  const mountConfig = useMatchMountConfig(window.location.href)

  const { data: options } = useDanmakuOptions()

  const { comments, setComments, mediaInfo, status } = useStore(
    useShallow(({ comments, setComments, mediaInfo, status }) => {
      return { comments, setComments, mediaInfo, status }
    })
  )

  const { toast } = useToast()

  const container = useNodeMonitor(mountConfig?.containerQuery)
  const node = useNodeMonitor<HTMLVideoElement>(mountConfig?.mediaQuery)

  const danmakuEngine = useMemo(() => new DanmakuManager(), [])

  useEffect(() => {
    // if danmaku is created, destroy it when status is stopped
    if (danmakuEngine.created) {
      if (status === 'stopped' || comments.length === 0) {
        Logger.debug('Destroying danmaku')
        danmakuEngine.destroy()
      }
      return
    }

    // if media is not ready, do nothing
    if (!options || !container || !node || !mountConfig) return

    // if danmaku is not created, create it when status is playing
    if (status === 'playing' && comments.length > 0) {
      Logger.debug('Creating danmaku')
      toast.success(
        `Danmaku mounted: ${mediaInfo?.toString() ?? ''} (${comments.length})`
      )
      danmakuEngine.create(container, node, comments, options)
    }
  }, [container, node, comments, options, status, mountConfig])

  useEffect(() => {
    if (!danmakuEngine.created || !options) return

    Logger.debug('Updating danmaku config', options, danmakuEngine)
    danmakuEngine.updateConfig(options)
  }, [options])

  useEffect(() => {
    Logger.debug('Container changed', {
      danmakuEngine,
      mountConfig,
      status,
    })
  }, [container, node])

  useEffect(() => {
    const handler = () => {
      if (danmakuEngine.created) {
        danmakuEngine.resize()
      }
    }
    window.addEventListener('resize', handler)

    return () => {
      danmakuEngine.destroy()
      window.removeEventListener('resize', handler)
    }
  }, [])

  useEffect(() => {
    const listener = (request: DanmakuControlMessage) => {
      if (request.action === 'danmakuControl/set') {
        Logger.debug('received message', request)
        setComments(request.payload.comments)
      }
      if (request.action === 'danmakuControl/unset') {
        Logger.debug('received message', request)
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
