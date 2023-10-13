import { Alert, Snackbar } from '@mui/material'
import { useToast } from './store'

export const Toast = () => {
  const { isOpen, onClose, duration, severity, message } = useToast()

  return (
    <Snackbar open={isOpen} autoHideDuration={duration} onClose={onClose}>
      <Alert onClose={onClose} severity={severity}>
        {message}
      </Alert>
    </Snackbar>
  )
}
