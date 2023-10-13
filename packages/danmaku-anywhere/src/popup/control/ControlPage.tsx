import { Box, Stack } from '@mui/material'

import { MountConfigEditor } from '@/popup/control/MountConfigEditor'
import { MountController } from '@/popup/control/MountController'

export const ControlPage = () => {
  return (
    <Box p={2}>
      <Stack direction="column" spacing={2}>
        <MountController />
        <MountConfigEditor />
      </Stack>
    </Box>
  )
}
