import { Delete } from '@mui/icons-material'
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { useStore } from '@/popup/store'

export const DeleteAllDanmakuButton = () => {
  const { setShowConfirmDeleteDialog } = useStore.use.danmaku()
  const { data, isFetching } = useAllDanmakuSuspense()
  const { t } = useTranslation()

  return (
    <MenuItem
      onClick={() => setShowConfirmDeleteDialog(true)}
      disabled={data.length === 0 || isFetching}
    >
      <ListItemIcon>
        <Delete />
      </ListItemIcon>
      <ListItemText>{t('danmakuPage.deleteAll')}</ListItemText>
    </MenuItem>
  )
}
