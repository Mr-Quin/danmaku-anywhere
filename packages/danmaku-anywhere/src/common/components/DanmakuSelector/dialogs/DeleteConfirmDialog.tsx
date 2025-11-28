import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { useDanmakuTreeContext } from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'

export const DeleteConfirmDialog = (): ReactElement => {
  const { t } = useTranslation()
  const { deletingDanmaku, setDeletingDanmaku } = useDanmakuTreeContext()

  const deleteDanmakuMutation = useDeleteEpisode()
  const deleteSeasonMutation = useDeleteSeason()

  const handleClose = () => {
    setDeletingDanmaku(null)
  }

  const handleConfirm = () => {
    if (!deletingDanmaku) return

    if (deletingDanmaku.kind === 'episode') {
      const { episode } = deletingDanmaku
      if (isNotCustom(episode)) {
        deleteDanmakuMutation.mutate(
          {
            isCustom: false,
            filter: { ids: [episode.id] },
          },
          {
            onSuccess: handleClose,
          }
        )
      } else {
        deleteDanmakuMutation.mutate(
          {
            isCustom: true,
            filter: { ids: [episode.id] },
          },
          {
            onSuccess: handleClose,
          }
        )
      }
    } else if (
      deletingDanmaku.kind === 'season' &&
      !isNotCustom(deletingDanmaku.season)
    ) {
      deleteSeasonMutation.mutate(deletingDanmaku.season.id, {
        onSuccess: handleClose,
      })
    }
  }

  return (
    <Dialog open={!!deletingDanmaku} onClose={handleClose}>
      <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('danmakuPage.confirmDeleteMessage')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          autoFocus
          disabled={
            deleteDanmakuMutation.isPending || deleteSeasonMutation.isPending
          }
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          loading={
            deleteDanmakuMutation.isPending || deleteSeasonMutation.isPending
          }
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
