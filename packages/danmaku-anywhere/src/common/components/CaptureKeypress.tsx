import { getOS } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { Box, type BoxProps, Typography, styled } from '@mui/material'
import { type ReactNode, memo, useEffect, useRef, useState } from 'react'

const KeyOverlay = styled('div')(() => {
  return {
    width: '100%',
    height: '100%',
    wordBreak: 'break-all',
    pointerEvents: 'none',
    userSelect: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fade-out 1s linear forwards',

    '@keyframes fade-out': {
      from: {
        opacity: 1,
      },
      to: {
        opacity: 0,
      },
    },
  }
})
const KeyOverlayMemo = memo(KeyOverlay)

type CaptureKeypressRenderProps = {
  focused: boolean
  disabled: boolean
}

type CaptureKeydownProps = {
  onChange: (value: string) => void
  value: string
  disabled?: boolean
  autoFocus?: boolean
  children?: ReactNode | ((props: CaptureKeypressRenderProps) => ReactNode)
  boxProps?: BoxProps
}
export const CaptureKeypress = ({
  onChange,
  value,
  disabled,
  autoFocus,
  children,
  boxProps,
}: CaptureKeydownProps) => {
  const [focused, setFocused] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const timeout = useRef<NodeJS.Timeout>(null)
  const resetTimeout = useRef<NodeJS.Timeout>(null)
  const resetDelay = useRef(true)

  useEffect(() => {
    if (autoFocus) {
      boxRef.current?.focus()
    }
  }, [])

  const handleFocus = () => {
    setFocused(true)
  }

  const handleBlur = () => {
    setFocused(false)
  }

  const handleAnimation = () => {
    overlayRef.current?.getAnimations().forEach((animation) => {
      /**
       * for some reason, when calling animation.cancel() and animation.play() in quick succession,
       * the animation can get stuck in the "running" state and never finish.
       * deferring the play in a timeout seems to fix this
       */
      animation.cancel()
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
      timeout.current = setTimeout(() => {
        animation.play()
      }, 1000)
    })
  }

  const updateValue = (key: string) => {
    handleAnimation()

    if (resetTimeout.current) {
      clearTimeout(resetTimeout.current)
    }

    if (resetDelay.current) {
      onChange(key)
      resetDelay.current = false
    } else {
      onChange(value + key)
      resetTimeout.current = setTimeout(() => {
        resetDelay.current = true
      }, 2000)
    }
  }

  return (
    <Box
      tabIndex={-1}
      ref={boxRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...withStopPropagation({
        onKeyDownCapture: (e) => {
          if (disabled) return

          if (e.key === 'Backspace') {
            handleAnimation()

            // hold cmd/ctrl to delete all
            if (getOS() === 'MacOS') {
              if (e.metaKey) {
                onChange('')
              }
            } else if (e.ctrlKey) {
              onChange('')
            } else {
              onChange(value.slice(0, -1))
            }
            return
          }

          if (e.ctrlKey || e.metaKey || e.altKey) return
          if (e.key.length > 1) return

          // no leading spaces
          if (!value && e.key === ' ') return

          updateValue(e.key)
        },
      })}
      {...boxProps}
    >
      {!disabled && (
        <KeyOverlayMemo ref={overlayRef}>
          <Typography variant="h1" component="div">
            {value}
          </Typography>
        </KeyOverlayMemo>
      )}
      {typeof children === 'function'
        ? children({ focused, disabled: !!disabled })
        : children}
    </Box>
  )
}
