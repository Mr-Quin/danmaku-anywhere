import type { SnackbarProps } from '@mui/material'
import { Alert, Button, Snackbar } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from './toastStore'

export const Toast = (props: SnackbarProps) => {
  const {
    isOpen,
    close,
    duration,
    severity,
    message,
    key,
    actionFn,
    actionLabel,
    unsetAction,
  } = useToast(useShallow((state) => state))

  return (
    <Snackbar
      open={isOpen}
      key={key}
      autoHideDuration={duration}
      onClose={close}
      TransitionProps={{
        onExited: unsetAction,
      }}
      disableWindowBlurListener
      {...props}
    >
      <Alert
        onClose={close}
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
                close()
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
