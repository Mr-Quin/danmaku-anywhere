import { useImage } from '@/common/components/image/useImage'
import { IMAGE_ASSETS } from '@/images/ImageAssets'

export const usePreloadImages = () => {
  for (const image of Object.values(IMAGE_ASSETS)) {
    // biome-ignore lint/correctness/useHookAtTopLevel: IMAGE_ASSETS is a constant, so every render calls the same hooks in the same order
    useImage(image)
  }
}
