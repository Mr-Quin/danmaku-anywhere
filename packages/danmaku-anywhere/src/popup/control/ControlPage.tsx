import { Box, Stack } from '@mui/material'
import { blankMountConfig } from '@/common/constants'
import {
  useActiveTabUrl,
  useCurrentMountConfig,
  useMountConfig,
} from '@/common/hooks/mountConfig/useMountConfig'
import { MountConfigEditor } from '@/popup/control/MountConfigEditor'
import { MountController } from '@/popup/control/MountController'

export const ControlPage = () => {
  const url = useActiveTabUrl()
  const { updateConfig, addConfig, deleteConfig, configs } = useMountConfig()
  const config = useCurrentMountConfig(url, configs)

  return (
    <Box p={2}>
      <Stack direction="column" spacing={2}>
        <MountController />
        <MountConfigEditor
          config={config ?? blankMountConfig(url ?? '')}
          onUpdate={updateConfig}
          onAdd={addConfig}
          onDelete={deleteConfig}
        />
      </Stack>
    </Box>
  )
}
