import Fallback from '@/assets/cover_fallback.png'
import DanDanPlayLogo from '@/assets/dandanplay_logo.png'
import Apologize from '@/assets/danmaku_apologize.png'
import Empty from '@/assets/danmaku_empty.png'
import { useImage } from '@/common/components/image/useImage'

export const images = {
  Fallback,
  DanDanPlayLogo,
  Empty,
  Apologize,
} as const

export const usePreloadImages = () => {
  Object.values(images).forEach((image) => useImage(image))
}
