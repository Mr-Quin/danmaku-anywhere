import {
  DanDanComment,
  useDanmakuEngine,
} from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useEffect, useState } from 'react'
import {
  useCurrentMountConfig,
  useMountConfig,
} from '@/common/hooks/mountConfig/useMountConfig'
import { useRuntimeMessage } from '@/common/hooks/useMessages'
import { contentLogger } from '@/common/logger'
import { useNodeMonitor } from '@/content/useNodeMonitor'
import { useToast } from './store'

export const useDanmakuManager = () => {
  const { configs } = useMountConfig()
  const url = window.location.href
  const mountConfig = useCurrentMountConfig(url, configs)

  const [comments, setComments] = useState<DanDanComment[]>([])

  const container = useNodeMonitor(mountConfig?.containerQuery)
  const node = useNodeMonitor<HTMLVideoElement>(mountConfig?.mediaQuery)

  const store = useDanmakuEngine({
    container: container ?? undefined,
    media: node ?? undefined,
    comments,
  })

  const { toast } = useToast((state) => state)

  useEffect(() => {
    contentLogger.debug({
      url,
      comments: comments.length,
      node,
      container,
      store,
      mountConfig,
    })
  })

  useRuntimeMessage(
    useCallback(
      (request: any) => {
        if (request.action === 'danmaku/start') {
          // start the inspector mode
          contentLogger.debug('received message', request)
          setComments(request.payload.comments)
          toast.success('Danmaku started')
        }
        if (request.action === 'danmaku/stop') {
          // stop the inspector mode
          contentLogger.debug('received message', request)
          setComments([])
          toast.info('Danmaku stopped')
        }
      },
      [store]
    )
  )

  return null
}
