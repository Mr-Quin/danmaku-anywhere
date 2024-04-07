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

import { useToast } from '@/common/components/toast/toastStore'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { useStore } from '@/popup/store'

export const ConfirmDeleteDialog = () => {
  const { deleteConfig } = useMountConfig()

  const { showConfirmDeleteDialog, setShowConfirmDeleteDialog, editingConfig } =
    useStore.use.config()

  const toast = useToast.use.toast()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return deleteConfig(editingConfig.name)
    },
    onSuccess: () => {
      toast.success('Config deleted')
      setShowConfirmDeleteDialog(false)
      handleClose()
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })

  const handleClose = () => {
    setShowConfirmDeleteDialog(false)
  }

  return (
    <Dialog open={showConfirmDeleteDialog} onClose={handleClose}>
      <DialogTitle>Confirm delete</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`Are you sure you want to delete "${editingConfig.name}"?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus disabled={isPending}>
          Cancel
        </Button>
        <LoadingButton
          onClick={() => mutate()}
          color="error"
          loading={isPending}
        >
          Delete
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}
