import { useDanmakuEngine } from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useToast } from './toastStore'
import { useStore } from './store'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { useRuntimeMessage } from '@/common/hooks/useMessages'
import { contentLogger } from '@/common/logger'
import { useNodeMonitor } from '@/content/hooks/useNodeMonitor'

export const useDanmakuManager = () => {
  const mountConfig = useMatchMountConfig(window.location.href)

  const { comments, setComments } = useStore(
    useShallow(({ comments, setComments }) => {
      return { comments, setComments }
    })
  )

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
      comments: comments.length,
      node,
      container,
      store,
      mountConfig,
    })
  }, [container, node, comments])

  useRuntimeMessage(
    useCallback(
      (request: any) => {
        if (request.action === 'danmaku/start') {
          // start the inspector mode
          contentLogger.debug('received message', request)
          useStore.setState(request.payload.comments)
          toast.success('Danmaku started')
        }
        if (request.action === 'danmaku/stop') {
          // stop the inspector mode
          contentLogger.debug('received message', request)
          setComments([])
          store.destroy()
          toast.info('Danmaku stopped')
        }
      },
      [store]
    )
  )

  return null
}
