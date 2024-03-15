import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useEffect as useLayoutEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useStore } from '../store/store'
import { useToast } from '../store/toastStore'

import { useManualDanmaku } from './useManualDanmaku'
import { useRect } from './useRect'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { Logger } from '@/common/services/Logger'
import { useNodeMonitor } from '@/content/hooks/useNodeMonitor'

// listen to comment changes and mount/unmount the danmaku engine
export const useDanmakuManager = (config: MountConfig) => {
  const { data: options } = useDanmakuOptions()

  const { comments, mediaInfo, status } = useStore(
    useShallow(({ comments, setComments, mediaInfo, status }) => {
      return { comments, setComments, mediaInfo, status }
    })
  )

  const { toast } = useToast()

  const videoNode = useNodeMonitor<HTMLVideoElement>(config.mediaQuery)

  const rect = useRect(videoNode)
  const ref = useRef<HTMLDivElement>(null)

  const danmakuEngine = useMemo(() => new DanmakuManager(), [])

  useManualDanmaku(danmakuEngine, videoNode, ref.current)

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
    if (!ref.current || !videoNode) return

    // if danmaku is not created, create it when status is playing
    if (status === 'playing' && comments.length > 0) {
      Logger.debug('Creating danmaku', {
        container: ref.current,
        node: videoNode,
        engine: danmakuEngine,
      })
      toast.success(
        `Danmaku mounted: ${mediaInfo?.toString() ?? ''} (${comments.length})`
      )
      danmakuEngine.create(ref.current, videoNode, comments, options)
    }
  }, [videoNode, comments, options, status, config])

  useEffect(() => {
    if (!danmakuEngine.created) return

    Logger.debug('Updating danmaku config', options, danmakuEngine)
    danmakuEngine.updateConfig(options)
  }, [options])

  useLayoutEffect(() => {
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

  return [ref, rect] as const
}
