import { useImageSuspense } from '@/common/components/image/useImage'
import { images } from '@/common/components/image/usePreloadImages'

export const DanDanPlayIcon = () => {
  const image = useImageSuspense(images.DanDanPlayLogo)
  if (!image.data) return null
  return <img src={image.data} width="24px" alt=""></img>
}
