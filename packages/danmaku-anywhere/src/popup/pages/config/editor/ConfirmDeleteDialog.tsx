import { LoadingButton } from '@mui/lab'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useState } from 'react'

export const ConfirmDeleteDialog = ({
  name,
  open,
  onClose,
  onDelete,
}: {
  name: string
  open: boolean
  onClose: () => void
  onDelete: () => Promise<void>
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`Are you sure you want to delete "${name}"?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          onClick={handleDelete}
          color="error"
          loading={isDeleting}
        >
          Delete
        </LoadingButton>
        <Button onClick={onClose} autoFocus disabled={isDeleting}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
