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
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'

interface ConfirmDeleteDialogProps {
  open: boolean
  provider: ProviderConfig | null
  onClose: () => void
}

export const ConfirmDeleteDialog = ({
  open,
  provider,
  onClose,
}: ConfirmDeleteDialogProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { remove } = useEditProviderConfig()

  const handleConfirm = async () => {
    if (!provider?.id || provider.isBuiltIn) {
      return
    }

    remove.mutate(provider.id, {
      onSuccess: () => {
        toast.success(t('providers.alert.deleted'))
        onClose()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('providers.delete.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('providers.delete.message', { name: provider?.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
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
