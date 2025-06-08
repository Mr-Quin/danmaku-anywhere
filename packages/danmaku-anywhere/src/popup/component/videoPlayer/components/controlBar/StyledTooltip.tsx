import {
  Tooltip,
  type TooltipProps,
  styled,
  tooltipClasses,
} from '@mui/material'

export const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
    padding: theme.spacing(1),
    fontSize: '0.875rem',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: 'rgba(0, 0, 0, 0.8)',
  },
}))
