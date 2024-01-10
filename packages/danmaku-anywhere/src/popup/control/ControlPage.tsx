import { Box, Typography } from '@mui/material'

import { useStore } from '../store'
import { MountController } from './MountController'
import { DanmakuOptionsController } from './DanmakuOptionsController'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'

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
      <DanmakuOptionsController />
      <MountController />
    </Box>
  )
}
