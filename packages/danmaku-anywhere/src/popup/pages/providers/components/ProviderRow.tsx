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
        sx={{ minWidth: 0, my: 0 }}
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

  // Reserve the action's width on the row content so the truncated text stops
  // before it; the descendant selector is what actually constrains the button.
  const pr = action ? 12 : 1
  return (
    <ListItem
      disablePadding
      secondaryAction={action}
      sx={{ '& .MuiListItemButton-root, & .ProviderRow-static': { pr } }}
    >
      {onClick ? (
        <ListItemButton onClick={onClick}>{content}</ListItemButton>
      ) : (
        <Box
          className="ProviderRow-static"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            px: 1,
            py: 0.75,
          }}
        >
          {content}
        </Box>
      )}
    </ListItem>
  )
}
