import { Box, type BoxProps } from '@mui/material'
import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { IMAGE_ASSETS } from '@/images/ImageAssets'
import { useImageSuspense } from './useImage'

type ImageProps = {
  fallback?: ReactNode
  throwOnNull?: boolean
  src: string
  alt?: string
  width?: number
  height?: number
} & Omit<BoxProps<'img'>, 'src' | 'alt' | 'component'>

const SuspenseImageLoader = ({
  fallback,
  throwOnNull,
  src,
  alt,
  width,
  height,
  ...rest
}: ImageProps) => {
  const image = useImageSuspense(src || IMAGE_ASSETS.Fallback)
  const fallbackImage = useImageSuspense(IMAGE_ASSETS.Fallback)

  const data = image.data ?? fallbackImage.data

  if (!data) {
    if (throwOnNull) {
      throw new Error(`Image ${src} not found`)
    }
    return fallback
  }

  return (
    <Box
      component="img"
      {...rest}
      src={data}
      alt={alt}
      width={width}
      height={height}
    />
  )
}

export const SuspenseImage = ({ fallback, ...rest }: ImageProps) => {
  return (
    <ErrorBoundary fallback={<>{fallback}</>} resetKeys={[rest.src]}>
      <SuspenseImageLoader fallback={fallback} {...rest} />
    </ErrorBoundary>
  )
}
