import {
  Box,
  ListItem,
  ListItemButton,
  ListItemText,
  type SxProps,
  type Theme,
} from '@mui/material'
import type { ReactNode } from 'react'
import { HashAvatar } from '@/common/components/HashAvatar'

export const sourceCardSx: SxProps<Theme> = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  overflow: 'hidden',
  userSelect: 'none',
}

interface ProviderRowProps {
  avatarSeed?: string
  primary: ReactNode
  secondary?: ReactNode
  mono?: boolean
  dense?: boolean
  onClick?: () => void
  action?: ReactNode
}

// The clickable area flexes and shrinks; the action sits beside it as a flex
// sibling, so the truncated text can never run under the toggle/menu.
export const ProviderRow = ({
  avatarSeed,
  primary,
  secondary,
  mono,
  dense,
  onClick,
  action,
}: ProviderRowProps) => {
  const content = (
    <>
      {avatarSeed !== undefined ? (
        <Box sx={{ mr: 1.5, display: 'flex' }}>
          <HashAvatar seed={avatarSeed} label={String(primary)} />
        </Box>
      ) : null}
      <ListItemText
        sx={{ minWidth: 0, my: 0, overflow: 'hidden' }}
        primary={primary}
        secondary={secondary}
        slotProps={{
          primary: { noWrap: true, variant: dense ? 'body2' : 'body1' },
          secondary: {
            noWrap: true,
            sx: mono ? { fontFamily: 'ui-monospace, monospace' } : undefined,
          },
        }}
      />
    </>
  )

  return (
    <ListItem disablePadding sx={{ pr: 1 }}>
      {onClick ? (
        <ListItemButton onClick={onClick} sx={{ flex: 1, minWidth: 0 }}>
          {content}
        </ListItemButton>
      ) : (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            px: 1,
            py: 0.75,
          }}
        >
          {content}
        </Box>
      )}
      {action ? (
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {action}
        </Box>
      ) : null}
    </ListItem>
  )
}
