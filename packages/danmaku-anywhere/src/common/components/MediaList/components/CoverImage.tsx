import { mediaQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { CardMedia, Skeleton, styled } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ReactNode } from 'react'

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

export const CoverImage = ({
  src,
  alt,
  heightRatio,
  widthRatio,
  children,
}: CoverImageProps) => {
  const image = useSuspenseQuery({
    queryKey: mediaQueryKeys.image(src ?? ''),
    queryFn: async () => {
      if (!src) return null
      const res = await chromeRpcClient.fetchImage(src, { silent: true })
      return res.data
    },
    staleTime: Infinity,
    retry: false,
  })

  if (!image.data) return null

  return (
    <ImageAspectRatio widthRatio={widthRatio} heightRatio={heightRatio}>
      <StackingContext>
        <BackgroundImage src={image.data} />
        <CardMedia
          component="img"
          src={image.data}
          alt={alt}
          sx={{ maxHeight: '100%', position: 'relative' }}
        />
      </StackingContext>
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
