import type { SliderProps, TypographyProps } from '@mui/material'
import { Grid2, Box, Slider, Tooltip, Typography } from '@mui/material'
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
      <Tooltip title={tooltip} sx={{ width: 'fit-content' }}>
        <Typography id={id} gutterBottom {...typographyProps}>
          {label}
        </Typography>
      </Tooltip>
      <Grid2 container spacing={2}>
        <Grid2 size={gridSize}>
          <Slider aria-labelledby={id} {...rest} />
        </Grid2>
        {children}
      </Grid2>
    </Box>
  )
}
