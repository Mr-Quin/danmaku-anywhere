import { ChevronRight, Launch } from '@mui/icons-material'
import {
  Box,
  ButtonBase,
  type ButtonBaseProps,
  CircularProgress,
  Switch,
  type SxProps,
  type Theme,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'

type IconTone =
  | 'primary'
  | 'secondary'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'

interface SettingsGroupLabelProps {
  children: ReactNode
}

export const SettingsGroupLabel = ({ children }: SettingsGroupLabelProps) => {
  return (
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        color: 'text.secondary',
        px: 2,
        pt: 1.75,
        pb: 0.75,
      }}
    >
      {children}
    </Typography>
  )
}

interface SettingsGroupProps {
  children: ReactNode
  sx?: SxProps<Theme>
}

// A rounded card of rows. Dividers are drawn between rows by the group itself,
// so individual rows never need to know whether they are last.
export const SettingsGroup = ({ children, sx }: SettingsGroupProps) => {
  return (
    <Box
      sx={{
        mx: 1.5,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        '& > *:not(:last-child)': {
          borderBottom: 1,
          borderColor: 'divider',
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

const IconTile = ({
  tone,
  children,
}: {
  tone: IconTone
  children: ReactNode
}) => {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: (theme) => alpha(theme.palette[tone].main, 0.14),
        color: `${tone}.main`,
      }}
    >
      {children}
    </Box>
  )
}

interface RowBodyProps {
  icon?: ReactNode
  iconTone?: IconTone
  title: ReactNode
  subtitle?: ReactNode
  right: ReactNode
  truncate?: boolean
}

const RowBody = ({
  icon,
  iconTone = 'primary',
  title,
  subtitle,
  right,
  truncate,
}: RowBodyProps) => {
  return (
    <>
      {icon && <IconTile tone={iconTone}>{icon}</IconTile>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap={truncate} sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            noWrap={truncate}
            sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {right}
    </>
  )
}

const rowSx: SxProps<Theme> = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  px: 1.75,
  py: 1.25,
  textAlign: 'left',
  justifyContent: 'flex-start',
}

interface SettingsRowProps {
  icon?: ReactNode
  iconTone?: IconTone
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  external?: boolean
  onClick?: ButtonBaseProps['onClick']
  disabled?: boolean
  href?: string
  target?: string
  rel?: string
}

export const SettingsRow = ({
  icon,
  iconTone = 'primary',
  title,
  subtitle,
  right,
  external,
  onClick,
  disabled,
  href,
  target,
  rel,
}: SettingsRowProps) => {
  const defaultRight = external ? (
    <Launch fontSize="small" sx={{ color: 'text.secondary' }} />
  ) : (
    <ChevronRight
      fontSize="small"
      sx={{ color: 'text.secondary', opacity: 0.7 }}
    />
  )

  const body = (
    <RowBody
      icon={icon}
      iconTone={iconTone}
      title={title}
      subtitle={subtitle}
      right={right ?? defaultRight}
      truncate
    />
  )
  const sx = { ...rowSx, '&:hover': { bgcolor: 'action.hover' } }

  if (href) {
    return (
      <ButtonBase component="a" href={href} target={target} rel={rel} sx={sx}>
        {body}
      </ButtonBase>
    )
  }

  return (
    <ButtonBase sx={sx} onClick={onClick} disabled={disabled}>
      {body}
    </ButtonBase>
  )
}

interface SettingsStaticRowProps {
  icon?: ReactNode
  iconTone?: IconTone
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}

// A non-interactive row. Use when the row hosts its own controls (a button,
// chips) that would be invalid nested inside a ButtonBase.
export const SettingsStaticRow = ({
  icon,
  iconTone,
  title,
  subtitle,
  right,
}: SettingsStaticRowProps) => {
  return (
    <Box sx={rowSx}>
      <RowBody
        icon={icon}
        iconTone={iconTone}
        title={title}
        subtitle={subtitle}
        right={right}
      />
    </Box>
  )
}

interface SettingsToggleRowProps {
  title: ReactNode
  subtitle?: ReactNode
  checked: boolean
  onToggle: (checked: boolean) => void
  disabled?: boolean
  loading?: boolean
}

export const SettingsToggleRow = ({
  title,
  subtitle,
  checked,
  onToggle,
  disabled,
  loading,
}: SettingsToggleRowProps) => {
  return (
    <SettingsStaticRow
      title={title}
      subtitle={subtitle}
      right={
        loading ? (
          <CircularProgress size={20} sx={{ mr: 1 }} />
        ) : (
          <Switch
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
          />
        )
      }
    />
  )
}
