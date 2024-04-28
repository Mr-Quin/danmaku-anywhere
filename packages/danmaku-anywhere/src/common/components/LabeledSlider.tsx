import type { SliderProps, TypographyProps } from '@mui/material'
import { Slider, Box, Typography, Tooltip, Grid } from '@mui/material'
import { useId } from 'react'

interface LabeledSliderProps extends SliderProps {
  label: string
  tooltip?: string
  typographyProps?: TypographyProps
  children?: React.ReactNode
}

export const LabeledSlider = ({
  label,
  tooltip,
  typographyProps = {},
  children,
  ...rest
}: LabeledSliderProps) => {
  const id = useId()
  return (
    <Box>
      <Tooltip title={tooltip} sx={{ width: 'fit-content' }}>
        <Typography id={id} {...typographyProps}>
          {label}
        </Typography>
      </Tooltip>
      <Grid container spacing={2}>
        <Grid item xs>
          <Slider aria-labelledby={id} {...rest} />
        </Grid>
        {children}
      </Grid>
    </Box>
  )
}
