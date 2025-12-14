import { Box } from '@mui/material'
import { useMemo } from 'react'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { chooseRandom } from '@/common/utils/chooseRandom'
import { IMAGE_ASSETS } from '@/images/ImageAssets'

interface MascotImage {
  src: string
  transform: string
}

const mascotImages: MascotImage[] = [
  {
    src: IMAGE_ASSETS.CarryBook,
    transform: 'translate(5%, 10%)',
  },
  {
    src: IMAGE_ASSETS.LookingAtStar,
    transform: 'translate(16%, 20%)',
  },
  {
    src: IMAGE_ASSETS.LookingAtCat,
    transform: 'translate(0%, 11.5%)',
  },
] as const

export const SearchMascot = () => {
  const image = useMemo(() => chooseRandom(mascotImages), [])

  return (
    <Box
      overflow="hidden"
      position="absolute"
      maxWidth="100%"
      maxHeight="100%"
      bottom={0}
      right={0}
    >
      <SuspenseImage
        src={image.src}
        sx={{
          transform: image.transform,
        }}
        height={400}
        cache={false}
      />
    </Box>
  )
}
