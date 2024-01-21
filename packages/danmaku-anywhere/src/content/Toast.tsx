import { Alert, Snackbar } from '@mui/material'

import { useToast } from './store/toastStore'

export const Toast = () => {
  const { isOpen, close, duration, severity, message, key } = useToast()

  return (
    <Snackbar
      open={isOpen}
      key={key}
      autoHideDuration={duration}
      onClose={close}
    >
      <Alert onClose={close} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
