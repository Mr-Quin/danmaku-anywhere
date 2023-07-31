import { useDanmakuEngine } from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useState } from 'react'
import { useLocalDanmaku } from '@/common/hooks/danmaku/useLocalDanmaku'
import { useMessageListener } from '@/common/hooks/useMessages'
import { useNodeMonitor } from '@/content/Content'
import { DanmakuStartMessage } from '@/popup/DanmakuController'

export const DanmakuManager = () => {
  const [config, setConfig] = useState<any>({})
  const { danmaku } = useLocalDanmaku(config.episodeId)

  const container = useNodeMonitor('.Player-fullPlayerContainer-wBDz23')
  const node = useNodeMonitor<HTMLVideoElement>('video')

  console.log('danmaku', danmaku, node, container)

  useDanmakuEngine({
    container: container,
    media: node,
    comments: danmaku?.comments,
  })

  useMessageListener<DanmakuStartMessage>(
    useCallback((request) => {
      if (request.action === 'danmaku/start') {
        // start the inspector mode
        console.log('received message', request)
        const { episodeId, mediaQuery, containerQuery } = request.payload
        const mediaElement = document.querySelector(mediaQuery)
        const containerElement = document.querySelector(containerQuery)

        setConfig({
          episodeId,
          mediaElement,
          containerElement,
        })
      }
    }, [])
  )

  return null
}
