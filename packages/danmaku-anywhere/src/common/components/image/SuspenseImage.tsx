import type { ComponentProps, ReactNode } from 'react'
import { images } from '@/common/components/image/usePreloadImages'
import { useImageSuspense } from './useImage'

type ImageProps = {
  fallback?: ReactNode
  throwOnNull?: boolean
  src: string
  alt?: string
  width?: number
  height?: number
  cache?: boolean
} & ComponentProps<'img'>

export const SuspenseImage = ({
  fallback,
  throwOnNull,
  src,
  alt,
  width,
  height,
  cache,
  ...rest
}: ImageProps) => {
  // don't cache if src is empty
  const shouldCache = src === '' ? false : cache
  const image = useImageSuspense(src ?? images.Fallback, {
    cache: shouldCache,
  })

  if (!image.data) {
    if (throwOnNull) throw new Error(`Image ${src} not found`)
    return fallback
  }

  return (
    <img {...rest} src={image.data} alt={alt} width={width} height={height} />
  )
}
