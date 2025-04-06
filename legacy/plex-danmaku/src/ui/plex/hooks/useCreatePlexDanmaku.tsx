import { useEffect } from 'preact/hooks'

import { useMonitorPlexPlayer } from './useMonitorPlexPlayer'

import { useDanmaku, useStore } from '@/store/store'

export const useCreatePlexDanmaku = () => {
  const createDanmaku = useStore.use.createDanmaku()
  const [danmakuContainer, mediaElt, fullscreen] = useMonitorPlexPlayer()
  const { comments } = useDanmaku()
  const recreateDanmaku = useStore.use.recreateDanmaku()
  const destroyDanmaku = useStore.use.destroyDanmaku()

  // when comments are loaded, create the danmaku instance
  useEffect(() => {
    if (!danmakuContainer || !mediaElt || !comments) return
    createDanmaku(danmakuContainer, mediaElt)
  }, [danmakuContainer, mediaElt, comments])

  // recreate the danmaku instance when the video is fullscreened
  useEffect(() => {
    if (!fullscreen) destroyDanmaku()
    // we assume danmaku has already been created
    else recreateDanmaku()
  }, [fullscreen])
}
