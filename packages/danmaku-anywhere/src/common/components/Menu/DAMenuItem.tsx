import {
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  styled,
  type Theme,
  Tooltip,
} from '@mui/material'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'

interface StyledMenuItemProps {
  color?: string
}

function resolveColor(theme: Theme, colorPath: string | undefined) {
  if (!colorPath) {
    return
  }

  // biome-ignore lint/suspicious/noExplicitAny: cannot safely type this, instead we check the type later
  const palette = colorPath.split('.').reduce<any>((acc, part) => {
    if (acc) {
      return acc[part]
    }
    return undefined
  }, theme.palette)

  if (!palette) {
    return
  }

  if (typeof palette === 'string') {
    return palette
  }

  if (typeof palette === 'object') {
    if ('main' in palette) {
      return palette.main
    }
  }
}

const StyledMenuItem = styled(MenuItem, {
  shouldForwardProp: (prop) => prop !== 'color',
})<StyledMenuItemProps>(({ color, theme }) => ({
  ['.MuiListItemIcon-root']: {
    minWidth: '28px',
    color: resolveColor(theme, color),
  },
  ['.MuiListItemText-root']: {
    color: resolveColor(theme, color),
  },
}))

const MenuDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}))

interface DAMenuItemProps {
  item: DAMenuItemConfig
  onClose: () => void
}

export const DAMenuItem = ({ item, onClose }: DAMenuItemProps) => {
  if (item.kind === 'separator') {
    return <MenuDivider key={item.id} />
  }
  return (
    <Tooltip title={item.tooltip} key={item.id}>
      <div>
        <StyledMenuItem
          onClick={() => {
            item.onClick()
            onClose()
          }}
          disabled={item.disabled || item.loading}
          color={item.color}
        >
          <ListItemIcon>
            {item.loading ? <CircularProgress size={24} /> : item.icon}
          </ListItemIcon>
          <ListItemText>{item.label}</ListItemText>
        </StyledMenuItem>
      </div>
    </Tooltip>
  )
}
