import { Close } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { DialogConfig } from '@/common/components/Dialog/dialogStore'
import { getScrollBarProps } from '../layout/ScrollBox'

interface DialogRenderProps {
  config: DialogConfig
  isLoading: boolean
  isClosing: boolean
  globalContainer: HTMLElement | null
  onClose: (id: string) => void
  setLoading: (id: string, loading: boolean) => void
  onRemove: (id: string) => void
}

export const DialogRender = ({
  config,
  isLoading,
  isClosing,
  onClose,
  setLoading,
  onRemove,
  globalContainer,
}: DialogRenderProps) => {
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
    showCloseButton = false,
    container,
  } = config

  const { t } = useTranslation()

  const handleClose = () => {
    if (isLoading) {
      return
    }

    config.onCancel?.()

    onClose(id)
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
        onClose(id)
      } else {
        onClose(id)
      }
    } catch (error) {
      console.error('Dialog confirm error:', error)
      if (closeOnError) {
        onClose(id)
      }
      // If not closeOnError, we stop loading but keep dialog open
    } finally {
      setLoading(id, false)
    }
  }

  const renderTitle = () => {
    if (!showCloseButton && !title) {
      return null
    }
    if (typeof title === 'string') {
      return (
        <DialogTitle>
          {title}
          {showCloseButton && (
            <IconButton
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>
      )
    }

    return title
  }

  const renderContent = () => {
    if (!content) {
      return null
    }
    if (typeof content === 'string') {
      return (
        <DialogContent>
          <DialogContentText>{content}</DialogContentText>
        </DialogContent>
      )
    }
    return (
      <DialogContent sx={(theme) => getScrollBarProps(theme, 0.4)}>
        {content}
      </DialogContent>
    )
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
            onRemove(id)
          },
        },
      }}
      {...dialogProps}
    >
      {renderTitle()}
      {renderContent()}
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
}
