import type { SnackbarProps } from '@mui/material'
import { Alert, Button, Snackbar, styled } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from './toastStore'

interface ToastProps {
  snackbarProps?: SnackbarProps
  stackable?: boolean
  disableCloseOnClickAway?: boolean
}

interface AlertWithIndicatorProps {
  duration?: number
  pause?: boolean
}

const AlertWithIndicator = styled(Alert)<AlertWithIndicatorProps>(
  ({ severity, duration, pause, theme }) => {
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
        opacity: pause ? 0.2 : 0.5,
        transition: 'width linear',
        transitionDuration: `${duration}ms`,
        animation: 'reduceWidth',
        animationDuration: `${duration}ms`,
        animationTimingFunction: 'linear',
        animationFillMode: 'forwards',
        animationPlayState: pause ? 'paused' : 'running',
      },

      '@keyframes reduceWidth': {
        '0%': { width: '100%' },
        '100%': { width: '0%' },
      },
    }
  }
)

interface StackableSnackbarProps {
  stackable?: boolean
  index?: number
}

const StackableSnackbar = styled(Snackbar, {
  shouldForwardProp: (prop) =>
    !['stackable', 'pause'].some((key) => key === prop),
})<StackableSnackbarProps>(({ stackable, index }) => {
  if (!stackable || index === undefined) return {}
  return {
    '&.MuiSnackbar-root': {
      bottom: `${20 + index * 60}px`,
      transition: 'bottom 0.3s ease-in-out',
    },
  }
})

export const Toast = (props: ToastProps) => {
  const { close, dequeue, notifications, pause, unpause } = useToast(
    useShallow((state) => state)
  )

  return notifications.map(
    (
      { key, message, duration, severity, actionLabel, actionFn, open, paused },
      i
    ) => {
      return (
        <StackableSnackbar
          stackable={props.stackable}
          index={i}
          open={open}
          key={key}
          autoHideDuration={duration}
          onClose={(_, reason) => {
            if (reason === 'clickaway' && props.disableCloseOnClickAway) return
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
            onMouseOver={() => pause(key)}
            onMouseLeave={() => unpause(key)}
            pause={paused}
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
        </StackableSnackbar>
      )
    }
  )
}
