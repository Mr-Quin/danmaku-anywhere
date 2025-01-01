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
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/popup/store'

export const ConfirmDeleteDialog = () => {
  const { t } = useTranslation()

  const { showConfirmDeleteDialog, setShowConfirmDeleteDialog } =
    useStore.use.danmaku()

  const toast = useToast.use.toast()

  const { mutate, isPending } = useMutation({
    mutationKey: danmakuQueryKeys.all(),
    mutationFn: async () => {
      return chromeRpcClient.danmakuDeleteAll()
    },
    onSuccess: () => {
      toast.success(t('danmaku.alert.deleted'))
      setShowConfirmDeleteDialog(false)
      handleClose()
    },
    onError: (e) => {
      toast.error(t('danmaku.alert.deleteError', { message: e.message }))
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
          {t('danmakuPage.confirmDeleteMessage')}
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
