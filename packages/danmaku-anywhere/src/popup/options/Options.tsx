import { Download } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { Stack } from '@mui/material'

import { useExportDanmaku } from '../hooks/useExportDanmaku'

import { OptionsBar } from './OptionsBar'
import { OptionsPage } from './OptionsPage'

export const Options = () => {
  const { exportDanmaku, isLoading } = useExportDanmaku()

  return (
    <OptionsPage>
      <OptionsBar title="Options" />
      <Stack spacing={2} sx={{ px: 2, py: 1 }}>
        <LoadingButton
          sx={{ justifyContent: 'space-between' }}
          loading={isLoading}
          onClick={exportDanmaku}
          fullWidth
        >
          Export Danmaku
          <Download />
        </LoadingButton>
      </Stack>
    </OptionsPage>
  )
}
