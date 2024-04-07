import { DanmakuManager } from './danmakuManager/DanmakuManager'
import { MediaObserver } from './mediaObserver/MediaObserver'
import { useMatchObserver } from './mediaObserver/useMatchObserver'

import { useStore } from '@/content/store/store'

export const AutomaticDanmaku = () => {
  const manual = useStore((state) => state.manual)
  useMatchObserver()

  if (manual) return null

  return (
    <>
      <DanmakuManager />
      <MediaObserver />
    </>
  )
}
