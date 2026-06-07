import type { Theme } from '@mui/material'

// Right padding (spacing units) that reserves room for a row's trailing action.
export const LIST_ITEM_ACTION_SPACING = 12

export function listItemCardStyles(theme: Theme) {
  return {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    backgroundColor: theme.palette.background.paper,
    overflow: 'hidden' as const,
    userSelect: 'none' as const,
  }
}
