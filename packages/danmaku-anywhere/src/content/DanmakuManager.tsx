import {
  DanDanComment,
  useDanmakuEngine,
} from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useState } from 'react'
import { useRuntimeMessage } from '@/common/hooks/useMessages'
import { contentLogger } from '@/common/logger'
import { useNodeMonitor } from '@/content/Content'

export const DanmakuManager = () => {
  const [config, setConfig] = useState<any>({})
  const [comments, setComments] = useState<DanDanComment[]>([])

  const container = useNodeMonitor(config.containerQuery)
  const node = useNodeMonitor<HTMLVideoElement>(config.mediaQuery)

  const store = useDanmakuEngine({
    container: container ?? undefined,
    media: node ?? undefined,
    comments,
  })

  const iframe = document.querySelector('iframe')

  contentLogger.log(
    'danmaku',
    config,
    comments.length,
    node,
    container,
    store,
    document.querySelector('iframe'),
    iframe?.contentDocument
  )

  useRuntimeMessage(
    useCallback(
      (request: any) => {
        if (request.action === 'danmaku/start') {
          // start the inspector mode
          contentLogger.log('received message', request)
          const { comments, mediaQuery, containerQuery } = request.payload

          setComments(comments)
          setConfig({
            mediaQuery,
            containerQuery,
          })
        }
        if (request.action === 'danmaku/stop') {
          // stop the inspector mode
          contentLogger.log('received message', request)
          setComments([])
          setConfig({})
        }
      },
      [store]
    )
  )

  return null
}
