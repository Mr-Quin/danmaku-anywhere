import { Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { ModalDialog } from '@/common/components/ModalDialog'
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
    <ModalDialog
      open={showConfirmDeleteDialog}
      onClose={handleClose}
      dialogTitle={t('common.confirmDeleteTitle')}
      isTextContent
      actions={
        <>
          <Button onClick={handleClose} autoFocus disabled={remove.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            loading={remove.isPending}
          >
            {t('common.delete')}
          </Button>
        </>
      }
    >
      {t('common.confirmDeleteMessage', { name: editingConfig.name })}
    </ModalDialog>
  )
}
