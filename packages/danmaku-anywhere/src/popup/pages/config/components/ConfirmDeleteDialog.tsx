import { LoadingButton } from '@mui/lab'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useStore } from '@/popup/store'

export const ConfirmDeleteDialog = () => {
  const { t } = useTranslation()
  const { deleteConfig } = useMountConfig()

  const { showConfirmDeleteDialog, setShowConfirmDeleteDialog, editingConfig } =
    useStore.use.config()

  const toast = useToast.use.toast()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!editingConfig.id)
        throw new Error('Trying to delete a config without id')
      return deleteConfig(editingConfig.id)
    },
    onSuccess: () => {
      toast.success(t('configs.alert.deleted'))
      setShowConfirmDeleteDialog(false)
      handleClose()
    },
    onError: (e) => {
      toast.error(t('configs.alert.deleteError', { message: e.message }))
    },
  })

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
        <Button onClick={handleClose} autoFocus disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <LoadingButton
          onClick={() => mutate()}
          color="error"
          loading={isPending}
        >
          {t('common.delete')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}
