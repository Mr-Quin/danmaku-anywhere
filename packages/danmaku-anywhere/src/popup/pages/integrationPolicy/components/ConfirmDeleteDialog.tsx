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
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'

export const ConfirmDeleteDialog = ({
  open,
  policy,
  onDeleted,
  onClose,
}: {
  open: boolean
  policy: Integration
  onDeleted: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const { remove } = useIntegrationPolicyStore()

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
        <Button onClick={() => mutate()} color="error" loading={isPending}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
