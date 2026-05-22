import type { SliderProps, TypographyProps } from '@mui/material'
import { Box, Chip, Slider, Stack, Typography } from '@mui/material'
import type { ReactNode, SyntheticEvent } from 'react'
import { useId, useState } from 'react'

const MARK_FONT = { fontFamily: 'monospace', fontSize: '11px' } as const

interface LabeledSliderProps extends SliderProps {
  label: string
  tooltip?: string
  typographyProps?: TypographyProps
  children?: ReactNode
  /** When set, a chip in the label row shows the live drag value. */
  formatChipValue?: (value: number | number[]) => string
  /** Suppress `onChange` during drag; only emit on release. */
  commitOnRelease?: boolean
}

export const LabeledSlider = ({
  label,
  tooltip,
  typographyProps = {},
  children,
  formatChipValue,
  commitOnRelease,
  marks,
  sx,
  onChange,
  onChangeCommitted,
  value,
  ...rest
}: LabeledSliderProps) => {
  const id = useId()
  const [drag, setDrag] = useState<number | number[] | null>(null)
  const liveValue = drag ?? (value as number | number[])

  const handleChange = (
    event: Event,
    next: number | number[],
    activeThumb: number
  ) => {
    setDrag(next)
    if (!commitOnRelease) onChange?.(event, next, activeThumb)
  }

  const handleCommitted = (
    event: Event | SyntheticEvent,
    next: number | number[]
  ) => {
    setDrag(null)
    if (commitOnRelease) onChange?.(event as Event, next, 0)
    onChangeCommitted?.(event, next)
  }

  const lastMarkIdx = Array.isArray(marks) ? marks.length - 1 : -1
  const edgeAlignSx =
    lastMarkIdx >= 0
      ? {
          '& .MuiSlider-markLabel[data-index="0"]': {
            transform: 'translateX(0%)',
          },
          [`& .MuiSlider-markLabel[data-index="${lastMarkIdx}"]`]: {
            transform: 'translateX(-100%)',
          },
        }
      : undefined

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 0.5,
        }}
      >
        <Typography
          id={id}
          sx={{ flex: 1, fontWeight: 600 }}
          variant="body2"
          {...typographyProps}
        >
          {label}
        </Typography>
        {formatChipValue && (
          <Chip
            label={formatChipValue(liveValue)}
            size="small"
            variant="outlined"
            sx={{ ...MARK_FONT, height: 22 }}
          />
        )}
      </Stack>
      {tooltip && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          {tooltip}
        </Typography>
      )}
      <Slider
        aria-labelledby={id}
        value={liveValue}
        marks={marks}
        onChange={handleChange}
        onChangeCommitted={handleCommitted}
        sx={{
          '& .MuiSlider-markLabel': MARK_FONT,
          '& .MuiSlider-valueLabel': MARK_FONT,
          ...edgeAlignSx,
          ...sx,
        }}
        {...rest}
      />
      {children}
    </Box>
  )
}
