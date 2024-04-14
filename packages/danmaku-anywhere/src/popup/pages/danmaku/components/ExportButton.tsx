import { Download } from '@mui/icons-material'
import {
  CircularProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'

import { useExportDanmaku } from '../../../hooks/useExportDanmaku'

import { useAllDanmakuQuerySuspense } from '@/common/hooks/useAllDanmakuQuerySuspense'

export const ExportButton = () => {
  const { mutate, isPending } = useExportDanmaku()
  const { data, isFetching } = useAllDanmakuQuerySuspense()

  return (
    <MenuItem
      onClick={() => mutate()}
      disabled={data.length === 0 || isPending || isFetching}
    >
      <ListItemIcon>
        {isPending ? <CircularProgress size={24} /> : <Download />}
      </ListItemIcon>
      <ListItemText>Export All</ListItemText>
    </MenuItem>
  )
}
