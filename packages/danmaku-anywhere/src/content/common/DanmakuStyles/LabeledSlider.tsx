import type { SliderProps, TypographyProps } from '@mui/material'
import { Box, Grid, Slider, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useId } from 'react'

interface LabeledSliderProps extends SliderProps {
  label: string
  tooltip?: string
  typographyProps?: TypographyProps
  children?: ReactNode
  gridSize?: number
}

export const LabeledSlider = ({
  label,
  tooltip,
  typographyProps = {},
  children,
  gridSize = 12,
  ...rest
}: LabeledSliderProps) => {
  const id = useId()
  return (
    <Box>
      <div>
        <Typography id={id} gutterBottom {...typographyProps}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tooltip}
        </Typography>
      </div>
      <Grid container spacing={2}>
        <Grid size={gridSize}>
          <Slider aria-labelledby={id} {...rest} />
        </Grid>
        {children}
      </Grid>
    </Box>
  )
}
