import { LoadingButton } from '@mui/lab'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useStore } from '@/popup/store'

export const ConfirmDeleteDialog = () => {
  const { t } = useTranslation()
  const { remove } = useEditMountConfig()

  const { showConfirmDeleteDialog, setShowConfirmDeleteDialog, editingConfig } =
    useStore.use.config()

  const toast = useToast.use.toast()

  const handleDelete = () => {
    if (!editingConfig.id) return
    remove.mutate(editingConfig.id, {
      onSuccess: () => {
        toast.success(t('configs.alert.deleted'))
        setShowConfirmDeleteDialog(false)
        handleClose()
      },
      onError: (e) => {
        toast.error(t('configs.alert.deleteError', { message: e.message }))
      },
    })
  }

  const handleClose = () => {
    setShowConfirmDeleteDialog(false)
  }

  return (
    <Dialog open={showConfirmDeleteDialog} onClose={handleClose}>
      <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('common.confirmDeleteMessage', { name: editingConfig.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus disabled={remove.isPending}>
          {t('common.cancel')}
        </Button>
        <LoadingButton
          onClick={handleDelete}
          color="error"
          loading={remove.isPending}
        >
          {t('common.delete')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}
