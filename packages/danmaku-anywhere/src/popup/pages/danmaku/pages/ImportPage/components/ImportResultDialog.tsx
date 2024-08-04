import { LoadingButton } from '@mui/lab'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'

type ImportResultDialogProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  onSave: () => void
  disableSave: boolean
  isLoading: boolean
  caption?: string
}>

export const ImportResultDialog = ({
  open,
  onSave,
  onClose,
  isLoading,
  disableSave,
  children,
}: ImportResultDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('danmakuPage.upload.dialogTitle')}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <LoadingButton
          onClick={onSave}
          variant="contained"
          color="success"
          loading={isLoading}
          disabled={disableSave}
        >
          {t('danmakuPage.upload.confirm')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}
