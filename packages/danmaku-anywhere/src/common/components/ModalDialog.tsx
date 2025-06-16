import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  type DialogProps,
  DialogTitle,
  Divider,
} from '@mui/material'
import type { ReactNode } from 'react'

type ModalDialogProps = DialogProps & {
  dialogTitle: ReactNode
  content: ReactNode
  actions?: ReactNode
}

export const ModalDialog = ({
  dialogTitle,
  content,
  actions,
  ...rest
}: ModalDialogProps) => {
  const renderActions = () => {
    if (!actions) {
      return null
    }
    return (
      <>
        <Divider />
        <DialogActions>{actions}</DialogActions>
      </>
    )
  }

  return (
    <Dialog maxWidth="sm" fullWidth {...rest}>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <Divider />
      {typeof content === 'string' ? (
        <DialogContent>
          <DialogContentText>{content}</DialogContentText>
        </DialogContent>
      ) : (
        content
      )}
      {renderActions()}
    </Dialog>
  )
}
