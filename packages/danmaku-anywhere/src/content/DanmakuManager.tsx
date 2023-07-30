import { useDanmakuEngine } from '@danmaku-anywhere/danmaku-engine'
import { useCallback, useState } from 'react'
import { useLocalDanmaku } from '@/common/hooks/danmaku/useLocalDanmaku'
import { useMessageListener } from '@/common/hooks/useMessages'
import { DanmakuStartMessage } from '@/popup/DanmakuController'

export const DanmakuManager = () => {
  const [config, setConfig] = useState<any>({})
  const { danmaku } = useLocalDanmaku(config.episodeId)
  useDanmakuEngine({
    container: config.containerElement,
    media: config.mediaElement,
    comments: danmaku?.comments,
  })

  console.log(config, danmaku)

  useMessageListener<DanmakuStartMessage>(
    useCallback((request) => {
      if (request.action === 'danmaku/start') {
        // start the inspector mode
        console.log(request)
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
