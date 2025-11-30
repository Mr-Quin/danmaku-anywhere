import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogStore } from './dialogStore'

export const GlobalDialog = (): ReactElement | null => {
  const { t } = useTranslation()

  const dialogs = useDialogStore.use.dialogs()
  const loadingIds = useDialogStore.use.loadingIds()
  const closingIds = useDialogStore.use.closingIds()
  const close = useDialogStore.use.close()
  const remove = useDialogStore.use.remove()
  const setLoading = useDialogStore.use.setLoading()
  const globalContainer = useDialogStore.use.container()

  if (dialogs.length === 0) {
    return null
  }

  return (
    <>
      {dialogs.map((config) => {
        const {
          id,
          title,
          content,
          confirmText,
          cancelText,
          confirmColor = 'primary',
          dialogProps,
          hideCancel = false,
          hideConfirm = false,
          closeOnError = false,
          container,
        } = config

        const isLoading = loadingIds.includes(id)
        const isClosing = closingIds.includes(id)

        const handleClose = () => {
          if (isLoading) {
            return
          }

          config.onCancel?.()

          close(id)
        }

        const handleConfirm = async () => {
          if (!config.onConfirm) {
            handleClose()
            return
          }

          try {
            const result = config.onConfirm()
            if (result instanceof Promise) {
              setLoading(id, true)
              await result
              close(id)
            } else {
              close(id)
            }
          } catch (error) {
            console.error('Dialog confirm error:', error)
            if (closeOnError) {
              close(id)
            }
            // If not closeOnError, we stop loading but keep dialog open
          } finally {
            setLoading(id, false)
          }
        }

        const renderContent = () => {
          if (typeof content === 'string') {
            return <DialogContentText>{content}</DialogContentText>
          }
          return content
        }

        return (
          <Dialog
            key={id}
            open={!isClosing}
            onClose={handleClose}
            container={container || globalContainer}
            slotProps={{
              transition: {
                onExited: () => {
                  remove(id)
                },
              },
            }}
            {...dialogProps}
          >
            {title && <DialogTitle>{title}</DialogTitle>}
            {content && <DialogContent>{renderContent()}</DialogContent>}
            <DialogActions>
              {!hideCancel && (
                <Button onClick={handleClose} disabled={isLoading}>
                  {cancelText || t('common.cancel', 'Cancel')}
                </Button>
              )}
              {!hideConfirm && (
                <Button
                  onClick={handleConfirm}
                  color={confirmColor}
                  variant="contained"
                  loading={isLoading}
                  autoFocus
                >
                  {confirmText || t('common.confirm', 'Confirm')}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        )
      })}
    </>
  )
}
