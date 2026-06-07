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
  onClick?: () => void
  action?: ReactNode
}

export const ProviderRow = ({
  avatarSeed,
  primary,
  secondary,
  mono,
  onClick,
  action,
}: ProviderRowProps) => {
  const inner = (
    <>
      {avatarSeed !== undefined ? (
        <Box sx={{ mr: 1.5, display: 'flex' }}>
          <HashAvatar seed={avatarSeed} label={String(primary)} />
        </Box>
      ) : null}
      <ListItemText
        sx={{ minWidth: 0, my: 0 }}
        primary={primary}
        secondary={secondary}
        slotProps={{
          primary: { noWrap: true },
          secondary: {
            noWrap: true,
            sx: mono ? { fontFamily: 'ui-monospace, monospace' } : undefined,
          },
        }}
      />
    </>
  )

  return (
    <ListItem disablePadding secondaryAction={action}>
      {onClick ? (
        <ListItemButton onClick={onClick} sx={{ pr: action ? 12 : 1.5 }}>
          {inner}
        </ListItemButton>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            px: 1,
            py: 0.75,
            pr: action ? 12 : 1,
          }}
        >
          {inner}
        </Box>
      )}
    </ListItem>
  )
}
