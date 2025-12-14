import { useImage } from '@/common/components/image/useImage'
import { IMAGE_ASSETS } from '@/images/ImageAssets'

export const usePreloadImages = () => {
  Object.values(IMAGE_ASSETS).forEach((image) =>
    useImage(image, { cache: false })
  )
}
