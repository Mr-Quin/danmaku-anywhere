import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  loading,
}: DeleteConfirmDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('danmakuPage.confirmDeleteMessage')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" loading={loading}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
