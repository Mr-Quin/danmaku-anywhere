import { Download } from '@mui/icons-material'
import {
  CircularProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'

export const ExportAllDanmakuButton = () => {
  const { exportAll } = useExportDanmaku()
  const { data, isFetching } = useAllDanmakuQuerySuspense()
  const { t } = useTranslation()

  return (
    <MenuItem
      onClick={() => exportAll.mutate()}
      disabled={data.length === 0 || exportAll.isPending || isFetching}
    >
      <ListItemIcon>
        {exportAll.isPending ? <CircularProgress size={24} /> : <Download />}
      </ListItemIcon>
      <ListItemText>{t('danmakuPage.upload.exportAll')}</ListItemText>
    </MenuItem>
  )
}
