import { Box, Typography } from '@mui/material'

import { useStore } from '@/popup/store'

export const NoAnime = () => {
  const { animeFilter } = useStore.use.danmaku()

  if (animeFilter)
    return (
      <Box p={2}>
        <Typography>
          No anime found for with title &quot;{animeFilter}&quot;
        </Typography>
      </Box>
    )

  return (
    <Box p={2}>
      <Typography>No anime available</Typography>
    </Box>
  )
}
