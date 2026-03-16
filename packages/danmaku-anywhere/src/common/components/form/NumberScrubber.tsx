import {
  Add as AddIcon,
  Check as CheckIcon,
  Remove as RemoveIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material'
import type { SxProps, Theme } from '@mui/material'
import {
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Tooltip,
  useEventCallback,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface NumberScrubberProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  fastStep?: number
  slowStep?: number
  formatValue?: (val: number) => string
  unit?: string
  onReset?: () => void
  sx?: SxProps<Theme>
}

const StyledOutlinedInput = styled(OutlinedInput, {
  shouldForwardProp: (prop) => prop !== 'isDragging' && prop !== 'bgPosition',
})<{ isDragging: boolean; bgPosition: string }>(
  ({ theme, isDragging, bgPosition }) => {
    const major = isDragging
      ? theme.palette.text.secondary
      : theme.palette.text.disabled
    const minor = isDragging
      ? theme.palette.text.disabled
      : theme.palette.divider
    return {
      width: '100%',
      cursor: 'ew-resize',
      userSelect: 'none',
      touchAction: 'none',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      transition: 'background-color 0.2s',
      backgroundImage: `
      linear-gradient(90deg, transparent 39px, ${major} 39px, ${major} 40px),
      linear-gradient(90deg, transparent 7px, ${minor} 7px, ${minor} 8px)
    `,
      backgroundSize: '40px 8px, 8px 4px',
      backgroundRepeat: 'repeat-x, repeat-x',
      backgroundPosition: bgPosition,
      backgroundColor: isDragging ? theme.palette.action.hover : 'transparent',
      '& .MuiOutlinedInput-input': {
        textAlign: 'center',
        pointerEvents: 'none',
        paddingRight: '14px',
        paddingLeft: '14px',
      },
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
        backgroundImage: `
        linear-gradient(90deg, transparent 39px, ${theme.palette.text.secondary} 39px, ${theme.palette.text.secondary} 40px),
        linear-gradient(90deg, transparent 7px, ${theme.palette.divider} 7px, ${theme.palette.divider} 8px)
      `,
      },
    }
  }
)

export const NumberScrubber = ({
  value,
  onChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  fastStep = 10,
  slowStep = 0.1,
  formatValue = (v) => v.toString(),
  unit,
  onReset,
  sx,
}: NumberScrubberProps) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  const PIXELS_PER_STEP = 2

  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startValueRef = useRef(value)
  const boxRef = useRef<HTMLDivElement>(null)

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Hold-to-adjust timers
  const holdTimerRef = useRef<number | NodeJS.Timeout | null>(null)
  const intervalTimerRef = useRef<number | NodeJS.Timeout | null>(null)
  const holdDurationRef = useRef(0) // tracks how long the button has been held down (ms)

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString())
    }
  }, [value, isEditing])

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current as number)
    if (intervalTimerRef.current)
      clearInterval(intervalTimerRef.current as number)
    holdTimerRef.current = null
    intervalTimerRef.current = null
    holdDurationRef.current = 0
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  const doAdjustment = useCallback(
    (
      direction: 1 | -1,
      e: React.MouseEvent | React.PointerEvent | MouseEvent
    ) => {
      // Calculate current speed step
      let currentMultiplier = step
      const currentHoldMs = holdDurationRef.current

      // Stages of hold-to-fast
      if (currentHoldMs > 1500) {
        currentMultiplier = fastStep
      } else if (currentHoldMs > 500) {
        currentMultiplier = step * Math.max(1, Math.round(fastStep / step / 2)) // Medium speed
      }

      // Manual modifier keys override hold-to-fast
      if (e.shiftKey) currentMultiplier = fastStep
      if (e.altKey) currentMultiplier = slowStep

      // We use a functional approach using the current hook capture of `value`,
      // since onChange expects a number, not a function. Note that for setInterval
      // to pick up the latest value we need it via ref.

      // Let's store the latest value in a ref here so interval callbacks get the right one
      let newValue = valueRef.current + direction * currentMultiplier

      // Round to precision if in medium/fast stage and no modifier key is overriding
      if (currentHoldMs > 500 && !e.shiftKey && !e.altKey) {
        // e.g. round to nearest 100 if fastStep is 100
        newValue = Math.round(newValue / currentMultiplier) * currentMultiplier
      }

      newValue = Math.max(min, Math.min(max, newValue))
      valueRef.current = newValue
      onChange(newValue)
    },
    [step, fastStep, slowStep, min, max, onChange]
  )

  const startAdjusting = useCallback(
    (direction: 1 | -1, e: React.PointerEvent) => {
      if (isEditing) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      // Do one immediate adjustment
      doAdjustment(direction, e)

      // Start initial delay before repeated adjustments
      holdTimerRef.current = setTimeout(() => {
        // Start rapid interval
        intervalTimerRef.current = setInterval(() => {
          holdDurationRef.current += 50 // roughly track ms
          doAdjustment(direction, e)
        }, 50)
      }, 400)
    },
    [isEditing, doAdjustment]
  )

  const stopAdjusting = useCallback(
    (e: React.PointerEvent) => {
      clearTimers()
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [clearTimers]
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return
    isDraggingRef.current = true
    setIsDragging(true)
    startXRef.current = e.clientX
    startValueRef.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault() // Prevent text selection
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return

    const deltaX = e.clientX - startXRef.current
    let multiplier = step
    if (e.shiftKey) multiplier = fastStep
    if (e.altKey) multiplier = slowStep

    // Sensitivity
    const steps = Math.round(deltaX / PIXELS_PER_STEP)

    let newValue = startValueRef.current + steps * multiplier
    newValue = Math.max(min, Math.min(max, newValue))

    if (newValue !== value) {
      onChange(newValue)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleDoubleClick = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setIsDragging(false)
    }
    setIsEditing(true)
    setInputValue(value.toString())
  }

  const handleBlur = () => {
    setIsEditing(false)
    let numericValue = Number.parseFloat(inputValue)
    if (isNaN(numericValue)) numericValue = value
    numericValue = Math.max(min, Math.min(max, numericValue))
    if (numericValue !== value) {
      onChange(numericValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setInputValue(value.toString())
    }
  }

  const handleWheel = useEventCallback((e: WheelEvent) => {
    if (isEditing) return
    e.preventDefault()

    const delta = e.deltaY > 0 ? -1 : 1
    let multiplier = step
    if (e.shiftKey) multiplier = fastStep
    if (e.altKey) multiplier = slowStep

    let newValue = value + delta * multiplier
    newValue = Math.max(min, Math.min(max, newValue))

    if (newValue !== value) {
      onChange(newValue)
    }
  })

  useEffect(() => {
    const el = boxRef.current
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        el.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel, isEditing])

  const wrapperStyle: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    width: '100%',
    ...sx,
  }

  // Common side button props
  const getSideBtnProps = (direction: 1 | -1) => ({
    size: 'small' as const,
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) =>
      startAdjusting(direction, e),
    onPointerUp: stopAdjusting,
    onPointerCancel: stopAdjusting,
    onPointerLeave: stopAdjusting, // safely clear if dragged off
    sx: {
      bgcolor: 'action.hover',
      borderRadius: 1,
      minWidth: 32,
      height: 32,
      touchAction: 'none',
      userSelect: 'none',
      flexShrink: 0,
      '&:hover': {
        bgcolor: 'action.selected',
      },
    },
  })

  if (isEditing) {
    return (
      <Stack direction="row" sx={wrapperStyle}>
        <IconButton disabled {...getSideBtnProps(-1)}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <OutlinedInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          size="small"
          endAdornment={
            <InputAdornment
              position="end"
              sx={{ position: 'absolute', right: 8 }}
            >
              {unit && (
                <span
                  style={{ fontSize: '0.875rem', marginRight: 4, opacity: 0.7 }}
                >
                  {unit}
                </span>
              )}
              <IconButton
                size="small"
                edge="end"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBlur}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          }
          sx={{
            width: '100%',
            bgcolor: 'background.paper',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            ...sx, // consume sx here if any specific text styles were passed in
          }}
          inputProps={{
            style: {
              textAlign: 'center',
              paddingRight: '14px',
              paddingLeft: '14px',
            },
          }}
        />
        <IconButton disabled {...getSideBtnProps(1)}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    )
  }

  return (
    <Stack direction="row" sx={wrapperStyle}>
      <IconButton {...getSideBtnProps(-1)}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <StyledOutlinedInput
        readOnly
        value={formatValue(value)}
        size="small"
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        endAdornment={
          onReset ? (
            <InputAdornment
              position="end"
              sx={{ position: 'absolute', right: 8 }}
            >
              <Tooltip
                title={t('form.resetToZero', 'Reset to 0')}
                arrow
                placement="top"
              >
                <IconButton
                  size="small"
                  onClick={onReset}
                  onPointerDown={(e) => e.stopPropagation()}
                  sx={{ width: 24, height: 24 }}
                >
                  <RestartAltIcon sx={{ fontSize: '1.25rem' }} color="action" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : undefined
        }
        isDragging={isDragging}
        bgPosition={`${(value / (step || 1)) * PIXELS_PER_STEP}px bottom, ${(value / (step || 1)) * PIXELS_PER_STEP}px bottom`}
        sx={sx}
      />
      <IconButton {...getSideBtnProps(1)}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}
