import { Box, Typography } from '@mui/material'

import { useStore } from '../store'
import { MountController } from './MountController'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'

export const ControlPage = () => {
  const url = useStore((state) => state.tabUrl)

  const matchedConfig = useMatchMountConfig(url)

  if (!matchedConfig)
    return (
      <Box p={2}>
        <Typography variant="body1">
          No mount config found for this page.
        </Typography>
        <Typography variant="body1">{url}</Typography>
      </Box>
    )

  return (
    <Box p={2}>
      <MountController />
    </Box>
  )
}
