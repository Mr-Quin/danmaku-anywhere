import { Download } from '@mui/icons-material'
import {
  CircularProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'

export const ExportAllDanmakuButton = () => {
  const exportDanmaku = useExportDanmaku()
  const { data, isFetching } = useEpisodesLiteSuspense()
  const { t } = useTranslation()

  return (
    <MenuItem
      onClick={() =>
        exportDanmaku.mutate({
          filter: { all: true },
          customFilter: { all: true },
        })
      }
      disabled={data.length === 0 || exportDanmaku.isPending || isFetching}
    >
      <ListItemIcon>
        {exportDanmaku.isPending ? (
          <CircularProgress size={24} />
        ) : (
          <Download />
        )}
      </ListItemIcon>
      <ListItemText>{t('danmakuPage.exportAll')}</ListItemText>
    </MenuItem>
  )
}
