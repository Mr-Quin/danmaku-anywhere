import { CardMedia, Skeleton, styled } from '@mui/material'
import type { ReactNode } from 'react'
import { useImage } from '@/common/components/image/useImage'

import { IMAGE_ASSETS } from '@/images/ImageAssets'

type ImageAspectRatioProps = {
  widthRatio?: number
  heightRatio?: number
}

const ImageAspectRatio = styled('div', {
  shouldForwardProp: (prop) => prop !== 'widthRatio' && prop !== 'heightRatio',
})<ImageAspectRatioProps>(({ widthRatio = 3, heightRatio = 4 }) => {
  return {
    position: 'relative',
    aspectRatio: `${widthRatio}/${heightRatio}`,
    display: 'flex',
    alignItems: 'center',
    contain: 'paint',
    isolation: 'isolate',
  }
})

const StackingContext = styled('div')(() => {
  return {
    width: '100%',
    height: '100%',
    contain: 'paint ',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }
})

export const BackgroundImage = styled('img')(() => {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    objectFit: 'cover',
    filter: 'blur(8px)',
    transform: 'scale(1.1)',
    userSelect: 'none',
    pointerEvents: 'none',
  }
})

type CoverImageProps = {
  src?: string
  alt?: string
  children?: ReactNode
} & ImageAspectRatioProps

const CoverImageLoader = (props: CoverImageProps) => {
  const image = useImage(props.src || IMAGE_ASSETS.Fallback)
  const fallbackImage = useImage(IMAGE_ASSETS.Fallback)

  if (image.isPending) {
    return <Skeleton width="100%" height="100%" variant="rounded" />
  }

  const src = image.data ?? fallbackImage.data

  if (!src) {
    return null
  }

  return (
    <StackingContext>
      <BackgroundImage src={src} />
      <CardMedia
        component="img"
        src={src}
        alt={props.alt}
        sx={{ maxHeight: '100%', position: 'relative' }}
      />
    </StackingContext>
  )
}

export const CoverImage = ({
  widthRatio,
  heightRatio,
  children,
  ...rest
}: CoverImageProps) => {
  return (
    <ImageAspectRatio widthRatio={widthRatio} heightRatio={heightRatio}>
      <CoverImageLoader {...rest} />
      {children}
    </ImageAspectRatio>
  )
}

export const CoverImageSkeleton = () => {
  return (
    <ImageAspectRatio>
      <Skeleton width="100%" height="100%" variant="rounded" />
    </ImageAspectRatio>
  )
}
