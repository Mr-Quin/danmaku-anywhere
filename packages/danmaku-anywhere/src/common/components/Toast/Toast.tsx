import type { SnackbarProps } from '@mui/material'
import { Alert, Button, Snackbar, styled } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from './toastStore'

interface ToastProps {
  snackbarProps?: SnackbarProps
  stackable?: boolean
}

interface AlertWithIndicatorProps {
  duration?: number
}

const AlertWithIndicator = styled(Alert)<AlertWithIndicatorProps>(({
  severity,
  duration,
  theme,
}) => {
  if (!duration) return {}

  return {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '100%',
      height: '3px',
      backgroundColor: (() => {
        switch (severity) {
          case 'success':
            return theme.palette.success.main
          case 'info':
            return theme.palette.info.main
          case 'warning':
            return theme.palette.warning.main
          case 'error':
            return theme.palette.error.main
          default:
            return theme.palette.action.disabled
        }
      })(),
      opacity: 0.5,
      transition: 'width linear',
      transitionDuration: `${duration}ms`,
      animation: 'reduceWidth',
      animationDuration: `${duration}ms`,
      animationTimingFunction: 'linear',
      animationFillMode: 'forwards',
    },

    '@keyframes reduceWidth': {
      '0%': { width: '100%' },
      '100%': { width: '0%' },
    },
  }
})

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
          <AlertWithIndicator
            duration={duration}
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
          </AlertWithIndicator>
        </Snackbar>
      )
    }
  )
}
