import { Menu, type MenuProps, styled } from '@mui/material'
import type { PropsWithChildren, ReactElement } from 'react'
import { DAMenuItem } from '@/common/components/Menu/DAMenuItem'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'

const StyledMenu = styled(Menu)({
  zIndex: 1403,
})

export interface DrilldownMenuListProps extends PropsWithChildren {
  anchorEl?: HTMLElement | null
  anchorPosition?: { top: number; left: number } | null
  open: boolean
  onClose: () => void
  items?: DAMenuItemConfig[]
  dense?: boolean
  MenuProps?: Partial<MenuProps>
  buttonId?: string
}

export const DrilldownMenuList = ({
  anchorEl,
  anchorPosition,
  open,
  onClose,
  items,
  dense,
  children,
  MenuProps,
  buttonId,
}: DrilldownMenuListProps): ReactElement => {
  return (
    <StyledMenu
      anchorEl={anchorEl}
      anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
      anchorPosition={anchorPosition || undefined}
      open={open}
      onClose={onClose}
      slotProps={{
        list: {
          'aria-labelledby': buttonId,
          dense: dense,
        },
      }}
      {...MenuProps}
    >
      {children}
      {items?.map((item) => {
        return <DAMenuItem key={item.id} item={item} onClose={onClose} />
      })}
    </StyledMenu>
  )
}
