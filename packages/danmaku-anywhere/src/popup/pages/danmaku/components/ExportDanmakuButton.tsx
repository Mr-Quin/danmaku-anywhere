import { Download } from '@mui/icons-material'
import {
  CircularProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useStore } from '@/popup/store'

export const ExportDanmakuButton = () => {
  const { exportMany } = useExportDanmaku()
  const { data, isFetching } = useAllDanmakuQuerySuspense()
  const { t } = useTranslation()

  const selectedAnime = useStore.use.danmaku().selectedAnime

  const episodes = useMemo(() => {
    return data
      .filter((item) => item.meta.seasonTitle === selectedAnime)
      .map((item) => item.id)
  }, [data])

  return (
    <MenuItem
      onClick={() => exportMany.mutate(episodes)}
      disabled={data.length === 0 || exportMany.isPending || isFetching}
    >
      <ListItemIcon>
        {exportMany.isPending ? <CircularProgress size={24} /> : <Download />}
      </ListItemIcon>
      <ListItemText>{t('danmakuPage.upload.exportAnime')}</ListItemText>
    </MenuItem>
  )
}
