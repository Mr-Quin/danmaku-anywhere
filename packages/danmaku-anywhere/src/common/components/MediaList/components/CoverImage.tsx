import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { useImageSuspense } from '@/common/components/image/useImageSuspense'
import { CardMedia, Skeleton, styled } from '@mui/material'
import { ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

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
    contain: 'strict',
    isolation: 'isolate',
  }
})

const StackingContext = styled('div')(() => {
  return {
    width: '100%',
    height: '100%',
    contain: 'strict',
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
  const image = useImageSuspense(props.src ?? '')

  if (!image.data)
    return (
      <StackingContext>
        <SuspenseImage src="/cover_fallback.png" />
      </StackingContext>
    )

  return (
    <StackingContext>
      <BackgroundImage src={image.data} />
      <CardMedia
        component="img"
        src={image.data}
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
      <ErrorBoundary fallback={<div>Failed to load image</div>}>
        <Suspense fallback={<Skeleton width={'100%'} height={600} />}>
          <CoverImageLoader {...rest} />
        </Suspense>
      </ErrorBoundary>
      {children}
    </ImageAspectRatio>
  )
}

export const CoverImageSkeleton = () => {
  return (
    <ImageAspectRatio>
      <Skeleton width={'100%'} height={600} />
    </ImageAspectRatio>
  )
}
