import Fallback from '@/assets/cover_fallback.webp'
import DanDanPlayLogo from '@/assets/dandanplay_logo.webp'
import Apologize from '@/assets/danmaku_apologize.webp'
import Empty from '@/assets/danmaku_empty.webp'
import { useImage } from '@/common/components/image/useImage'

export const images = {
  Fallback,
  DanDanPlayLogo,
  Empty,
  Apologize,
  Logo: '/normal_192.png',
} as const

export const usePreloadImages = () => {
  Object.values(images).forEach((image) => useImage(image, { cache: false }))
}
