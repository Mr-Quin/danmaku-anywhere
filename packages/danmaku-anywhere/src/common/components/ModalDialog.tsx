import { Close } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  type DialogProps,
  DialogTitle,
  Divider,
  IconButton,
} from '@mui/material'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'

type ModalDialogProps = DialogProps & {
  dialogTitle?: ReactNode
  actions?: ReactNode
  confirmCloseContent?: ReactNode
  isTextContent?: boolean
  showCloseButton?: boolean
  disableCloseOutside?: boolean
  confirmClose?: boolean
}

export const ModalDialog = ({
  open,
  dialogTitle,
  actions,
  children,
  confirmCloseContent,
  showCloseButton = false,
  disableCloseOutside = false,
  confirmClose = false,
  isTextContent = false,
  onClose,
  ...rest
}: ModalDialogProps) => {
  const { t } = useTranslation()
  const [showConfirmCloseDialog, setShowConfirmCloseDialog] = useState(false)
  const blocker = useBlocker(confirmClose && open)

  const renderActions = () => {
    if (!actions) {
      return null
    }
    return <DialogActions>{actions}</DialogActions>
  }

  const handleClose: DialogProps['onClose'] = (event, reason) => {
    if (disableCloseOutside && reason === 'backdropClick') {
      return
    }

    if (confirmClose) {
      setShowConfirmCloseDialog(true)
      return
    }

    if (onClose) {
      onClose(event, reason)
    }
  }

  const handleConfirmClose = () => {
    setShowConfirmCloseDialog(false)
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      if (onClose) {
        onClose({}, 'escapeKeyDown')
      }
    }
  }

  const handleCancelClose = () => {
    setShowConfirmCloseDialog(false)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  return (
    <>
      <Dialog
        open={open}
        maxWidth="md"
        fullWidth
        {...rest}
        onClose={(event, reason) => handleClose(event, reason)}
      >
        {dialogTitle && (
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {dialogTitle}
            {showCloseButton && (
              <IconButton
                aria-label="close"
                onClick={(e) => handleClose(e, 'escapeKeyDown')}
                sx={{ ml: 2 }}
              >
                <Close />
              </IconButton>
            )}
          </DialogTitle>
        )}
        {isTextContent ? (
          <DialogContent>
            <DialogContentText>{children}</DialogContentText>
          </DialogContent>
        ) : (
          children
        )}
        {renderActions()}
      </Dialog>

      {/* Confirm close */}
      <Dialog
        open={blocker.state === 'blocked' || showConfirmCloseDialog}
        onClose={handleCancelClose}
        maxWidth="xs"
        fullWidth
      >
        <Divider />
        <DialogContent>
          <DialogContentText>
            {confirmCloseContent ?? t('common.confirmLeaveUnsavedChanges')}
          </DialogContentText>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={handleCancelClose} variant="contained">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirmClose} color="primary">
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
