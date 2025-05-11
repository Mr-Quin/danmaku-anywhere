import { useImageSuspense } from '@/common/components/image/useImage'

export const DanDanPlayIcon = () => {
  const image = useImageSuspense('/dandanplay_logo.png')
  if (!image.data) return null
  return <img src={image.data} width="24px" alt=""></img>
}
