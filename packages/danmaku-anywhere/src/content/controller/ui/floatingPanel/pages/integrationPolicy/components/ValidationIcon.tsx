import { CheckCircleOutline } from '@mui/icons-material'
import { Icon, Tooltip } from '@mui/material'

interface ValidationIconProps {
  state: 'success' | 'error' | 'disabled'
  tooltip: string
}

export const ValidationIcon = ({ state, tooltip }: ValidationIconProps) => {
  if (state === 'disabled')
    return (
      <Icon color="disabled">
        <CheckCircleOutline />
      </Icon>
    )

  if (state === 'error') {
    return (
      <Tooltip title={tooltip}>
        <Icon color="error">
          <CheckCircleOutline />
        </Icon>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={tooltip}>
      <Icon color="success">
        <CheckCircleOutline />
      </Icon>
    </Tooltip>
  )
}
