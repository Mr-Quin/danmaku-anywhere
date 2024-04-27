import { Download } from '@mui/icons-material'
import {
  CircularProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useExportDanmaku } from '../../../hooks/useExportDanmaku'

import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'

export const ExportDanmaku = () => {
  const { mutate, isPending } = useExportDanmaku()
  const { data, isFetching } = useAllDanmakuQuerySuspense()
  const { t } = useTranslation()

  return (
    <MenuItem
      onClick={() => mutate()}
      disabled={data.length === 0 || isPending || isFetching}
    >
      <ListItemIcon>
        {isPending ? <CircularProgress size={24} /> : <Download />}
      </ListItemIcon>
      <ListItemText>{t('common.export.all')}</ListItemText>
    </MenuItem>
  )
}
