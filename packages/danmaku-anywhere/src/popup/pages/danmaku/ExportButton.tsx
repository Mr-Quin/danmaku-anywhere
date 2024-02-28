import { Download } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'

import { useExportDanmaku } from '../../hooks/useExportDanmaku'

export const ExportButton = () => {
  const { exportDanmaku, isLoading } = useExportDanmaku()

  return (
    <LoadingButton
      sx={{ justifyContent: 'space-between' }}
      loading={isLoading}
      onClick={exportDanmaku}
    >
      Export Danmaku
      <Download />
    </LoadingButton>
  )
}
