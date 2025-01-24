import type { SnackbarProps } from '@mui/material'
import { Alert, Button, Snackbar } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from './toastStore'

interface ToastProps {
  snackbarProps?: SnackbarProps
  stackable?: boolean
}

export const Toast = (props: ToastProps) => {
  const { close, dequeue, notifications } = useToast(
    useShallow((state) => state)
  )

  return notifications.map(
    ({ key, message, duration, severity, actionLabel, actionFn, open }, i) => {
      const sx = props.stackable
        ? {
            '&.MuiSnackbar-root': { bottom: `${20 + i * 60}px` },
          }
        : undefined

      return (
        <Snackbar
          open={open}
          key={key}
          sx={sx}
          autoHideDuration={duration}
          onClose={(_, reason) => {
            if (reason === 'clickaway') return
            close(key)
          }}
          TransitionProps={{
            onExited: () => {
              dequeue(key)
            },
          }}
          disableWindowBlurListener
          {...props.snackbarProps}
        >
          <Alert
            onClose={() => close(key)}
            severity={severity}
            sx={{ width: '100%' }}
            action={
              actionFn ? (
                <Button
                  size="small"
                  color="inherit"
                  onClick={(e) => {
                    // prevent the event from triggering other events like ClickAwayListeners
                    e.stopPropagation()
                    actionFn()
                    close(key)
                  }}
                >
                  {actionLabel}
                </Button>
              ) : null
            }
          >
            {message}
          </Alert>
        </Snackbar>
      )
    }
  )
}
