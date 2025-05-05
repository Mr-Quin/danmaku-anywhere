import {
  Stack,
  Switch,
  type SwitchProps,
  Typography,
  type TypographyProps,
} from '@mui/material'
import { type ReactNode, useId } from 'react'

interface LabeledSwitchProps extends SwitchProps {
  label: string
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
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <div>
        <Typography id={id} {...typographyProps}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tooltip}
        </Typography>
      </div>
      <Switch {...rest} aria-labelledby={id} />
    </Stack>
  )
}
