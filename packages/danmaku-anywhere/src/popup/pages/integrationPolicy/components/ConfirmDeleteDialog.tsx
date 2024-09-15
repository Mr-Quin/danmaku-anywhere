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
import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import { useXPathPolicyStore } from '@/common/options/xpathPolicyStore/useXPathPolicyStore'

export const ConfirmDeleteDialog = ({
  open,
  policy,
  onDeleted,
  onClose,
}: {
  open: boolean
  policy: XPathPolicyItem
  onDeleted: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const { remove } = useXPathPolicyStore()

  const toast = useToast.use.toast()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return remove(policy.id)
    },
    onSuccess: () => {
      toast.success(t('configs.alert.deleted'))
      onDeleted()
      onClose()
    },
    onError: (e) => {
      toast.error(t('configs.alert.deleteError', { message: e.message }))
    },
  })

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('common.confirmDeleteMessage', { name: policy.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus disabled={isPending}>
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
