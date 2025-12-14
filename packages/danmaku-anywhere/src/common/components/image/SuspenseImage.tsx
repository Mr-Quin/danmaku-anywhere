import { Box, type BoxProps } from '@mui/material'
import type { ReactNode } from 'react'
import { IMAGE_ASSETS } from '@/images/ImageAssets'
import { useImageSuspense } from './useImage'

type ImageProps = {
  fallback?: ReactNode
  throwOnNull?: boolean
  src: string
  alt?: string
  width?: number
  height?: number
  cache?: boolean
} & Omit<BoxProps<'img'>, 'src' | 'alt' | 'component'>

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
  const image = useImageSuspense(src ?? IMAGE_ASSETS.Fallback, {
    cache: shouldCache,
  })

  if (!image.data) {
    if (throwOnNull) throw new Error(`Image ${src} not found`)
    return fallback
  }

  return (
    <Box
      component="img"
      {...rest}
      src={image.data}
      alt={alt}
      width={width}
      height={height}
    />
  )
}
