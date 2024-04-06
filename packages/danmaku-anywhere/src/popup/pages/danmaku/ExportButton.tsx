import { Download } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'

import { useExportDanmaku } from '../../hooks/useExportDanmaku'

export const ExportButton = () => {
  const { mutate, isPending } = useExportDanmaku()

  return (
    <LoadingButton
      sx={{ justifyContent: 'space-between' }}
      loading={isPending}
      onClick={() => mutate()}
    >
      Export All
      <Download />
    </LoadingButton>
  )
}
