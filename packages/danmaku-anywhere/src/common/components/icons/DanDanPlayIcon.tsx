import { useImageSuspense } from '@/common/components/image/useImage'

import { IMAGE_ASSETS } from '@/images/ImageAssets'

export const DanDanPlayIcon = () => {
  const image = useImageSuspense(IMAGE_ASSETS.DanDanPlayLogo)
  if (!image.data) return null
  return <img src={image.data} width="24px" alt="" />
}
