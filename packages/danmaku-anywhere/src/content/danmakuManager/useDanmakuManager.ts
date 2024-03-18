import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../store/store'
import { useToast } from '../store/toastStore'

import { useManualDanmaku } from './useManualDanmaku'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { Logger } from '@/common/services/Logger'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = (
  config: MountConfig,
  videoNode: HTMLVideoElement | null,
  containerNode: HTMLDivElement | null
) => {
  const { data: options } = useDanmakuOptions()

  const { comments, mediaInfo, status } = useStore(
    useShallow(({ comments, setComments, mediaInfo, status }) => {
      return { comments, setComments, mediaInfo, status }
    })
  )

  const { toast } = useToast()

  const danmakuEngine = useMemo(() => new DanmakuManager(), [])

  useManualDanmaku(danmakuEngine, videoNode, containerNode)

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
    if (!containerNode || !videoNode) return

    // if danmaku is not created, create it when status is playing
    if (status === 'playing' && comments.length > 0) {
      Logger.debug('Creating danmaku', {
        container: containerNode,
        node: videoNode,
        engine: danmakuEngine,
      })
      toast.success(
        `Danmaku mounted: ${mediaInfo?.toString() ?? ''} (${comments.length})`
      )
      danmakuEngine.create(containerNode, videoNode, comments, options)
    }
  }, [videoNode, comments, options, status, config])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options, danmakuEngine)
    danmakuEngine.updateConfig(options)
  }, [options])

  return danmakuEngine
}
