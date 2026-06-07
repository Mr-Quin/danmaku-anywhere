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
import {
  LIST_ITEM_ACTION_SPACING,
  listItemCardStyles,
} from '@/common/components/listItemStyles'

export const sourceCardSx: SxProps<Theme> = listItemCardStyles

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

  const pr = action ? LIST_ITEM_ACTION_SPACING : 1
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
