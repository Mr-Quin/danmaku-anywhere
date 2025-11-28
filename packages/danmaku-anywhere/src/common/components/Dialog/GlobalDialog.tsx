import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDialogStore } from './dialogStore'

export const GlobalDialog = () => {
  const { t } = useTranslation()
  const dialogs = useDialogStore.use.dialogs()
  const loadingIds = useDialogStore.use.loadingIds()
  const close = useDialogStore.use.close()
  const setLoading = useDialogStore.use.setLoading()

  // We render all dialogs, but we need to ensure we don't have issues with stacking.
  // MUI Dialog handles stacking via portals and z-index automatically.

  if (dialogs.length === 0) return null

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
        } = config

        const isLoading = loadingIds.includes(id)

        const handleClose = () => {
          if (isLoading) return
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
          <Dialog key={id} open={true} onClose={handleClose} {...dialogProps}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {content && <DialogContent>{renderContent()}</DialogContent>}
            <DialogActions>
              {!hideCancel && (
                <Button onClick={handleClose} disabled={isLoading}>
                  {cancelText || t('common.cancel')}
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
                  {confirmText || t('common.confirm')}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        )
      })}
    </>
  )
}
