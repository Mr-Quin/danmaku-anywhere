import { ComponentProps, ReactNode } from 'react'
import { useImageSuspense } from './useImageSuspense'

type ImageProps = {
  fallback?: ReactNode
  throwOnNull?: boolean
} & ComponentProps<'img'>

export const SuspenseImage = ({
  fallback,
  throwOnNull,
  ...rest
}: ImageProps) => {
  const image = useImageSuspense(rest.src ?? '')

  if (!image.data) {
    if (throwOnNull) throw new Error(`Image ${rest.src} not found`)
    return fallback
  }

  return <img {...rest} src={image.data} alt={rest.alt} />
}
