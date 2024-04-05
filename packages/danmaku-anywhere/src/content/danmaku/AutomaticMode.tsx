import { DanmakuManager } from './danmakuManager/DanmakuManager'
import { MediaObserver } from './mediaObserver/MediaObserver'

import { useStore } from '@/content/store/store'

export const AutomaticDanmaku = () => {
  const manual = useStore((state) => state.manual)

  if (manual) return null

  return (
    <>
      <DanmakuManager />
      <MediaObserver />
    </>
  )
}
