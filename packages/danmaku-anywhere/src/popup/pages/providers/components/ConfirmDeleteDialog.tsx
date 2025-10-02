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
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useStore } from '@/popup/store'

export const ConfirmDeleteDialog = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { remove } = useEditProviderConfig()

  const { showConfirmDeleteDialog, setShowConfirmDeleteDialog, editingProvider } =
    useStore.use.providers()

  const handleClose = () => {
    setShowConfirmDeleteDialog(false)
  }

  const handleConfirm = async () => {
    if (!editingProvider?.id) return

    remove.mutate(editingProvider.id, {
      onSuccess: () => {
        toast.success(t('providers.alert.deleted'))
        handleClose()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return (
    <Dialog open={showConfirmDeleteDialog} onClose={handleClose}>
      <DialogTitle>{t('providers.delete.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('providers.delete.message', { name: editingProvider?.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          loading={remove.isPending}
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
