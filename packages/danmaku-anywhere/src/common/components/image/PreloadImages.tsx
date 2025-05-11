import { useImage } from '@/common/components/image/useImage'

const images = [
  '/cover_fallback.png',
  '/dandanplay_logo.png',
  '/danmaku_apologize.png',
  '/danmaku_empty.png',
] as const

export const usePreloadImages = () => {
  images.forEach((image) => useImage(image))
}
