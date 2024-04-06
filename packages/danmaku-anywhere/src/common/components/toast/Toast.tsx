import type { SnackbarProps } from '@mui/material'
import { Alert, Snackbar } from '@mui/material'

import { useToast } from './toastStore'

export const Toast = (props: SnackbarProps) => {
  const { isOpen, close, duration, severity, message, key } = useToast()

  return (
    <Snackbar
      open={isOpen}
      key={key}
      autoHideDuration={duration}
      onClose={close}
      {...props}
    >
      <Alert onClose={close} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
