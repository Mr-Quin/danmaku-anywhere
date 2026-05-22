import {
  Stack,
  Switch,
  type SwitchProps,
  Typography,
  type TypographyProps,
} from '@mui/material'
import { type ReactNode, useId } from 'react'

interface LabeledSwitchProps extends SwitchProps {
  label: ReactNode
  tooltip?: string
  typographyProps?: TypographyProps
  children?: ReactNode
}

export const LabeledSwitch = ({
  label,
  tooltip,
  typographyProps,
  ...rest
}: LabeledSwitchProps) => {
  const id = useId()

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <Typography
          variant="body2"
          id={id}
          {...typographyProps}
          sx={[
            {
              fontWeight: 600,
            },
            ...(Array.isArray(typographyProps?.sx)
              ? typographyProps.sx
              : [typographyProps?.sx]),
          ]}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          {tooltip}
        </Typography>
      </div>
      <Switch {...rest} aria-labelledby={id} />
    </Stack>
  )
}
