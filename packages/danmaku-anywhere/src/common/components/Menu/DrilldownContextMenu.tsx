import {
  ClickAwayListener,
  Grow,
  MenuList,
  Paper,
  type PaperProps,
  Popper,
  styled,
} from '@mui/material'
import type { PropsWithChildren, ReactElement } from 'react'
import { useMemo } from 'react'
import { DAMenuItem } from '@/common/components/Menu/DAMenuItem'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'

// We style the Popper, not the Menu, to handle z-index
const StyledPopper = styled(Popper)({
  zIndex: 1403,
})

export interface DrilldownContextMenuProps extends PropsWithChildren {
  anchorEl?: HTMLElement | null
  // We keep this prop to maintain API compatibility with your usage
  anchorPosition?: { top: number; left: number } | null
  open: boolean
  onClose: () => void
  items?: DAMenuItemConfig[]
  dense?: boolean
  // Changed from MenuProps to PaperProps as we are no longer using Menu
  PaperProps?: Partial<PaperProps>
  buttonId?: string
}

export const DrilldownContextMenu = ({
  anchorEl,
  anchorPosition,
  open,
  onClose,
  items,
  dense,
  children,
  PaperProps,
  buttonId,
}: DrilldownContextMenuProps): ReactElement => {
  // 1. Create a Virtual Element if we are using x/y coordinates (anchorPosition)
  // Popper needs an object with a getBoundingClientRect function
  const anchorVirtualElement = useMemo(() => {
    if (!anchorPosition) return null
    return {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        top: anchorPosition.top,
        right: anchorPosition.left,
        bottom: anchorPosition.top,
        left: anchorPosition.left,
        x: anchorPosition.left,
        y: anchorPosition.top,
        toJSON: () => {
          // noop
        },
      }),
    }
  }, [anchorPosition])

  // Determine the final anchor (element or virtual)
  const finalAnchor = anchorEl || anchorVirtualElement

  return (
    <StyledPopper
      open={open && Boolean(finalAnchor)}
      anchorEl={finalAnchor}
      placement="bottom-start"
      transition
      // Modifiers ensure the menu flips if it hits the screen edge
      modifiers={[
        {
          name: 'preventOverflow',
          options: {
            altAxis: true,
            tether: false,
          },
        },
      ]}
    >
      {({ TransitionProps, placement }) => (
        <Grow
          {...TransitionProps}
          style={{
            transformOrigin:
              placement === 'bottom-start' ? 'left top' : 'left bottom',
          }}
        >
          {/* ClickAwayListener handles closing when clicking outside. 
              Because this is inside a Popper, clicks "pass through" to the UI below. */}
          <Paper elevation={8} {...PaperProps}>
            <ClickAwayListener onClickAway={onClose}>
              <MenuList
                autoFocusItem={false} // Prevents stealing focus immediately
                dense={dense}
                aria-labelledby={buttonId}
              >
                {children}
                {items?.map((item) => {
                  return (
                    <DAMenuItem key={item.id} item={item} onClose={onClose} />
                  )
                })}
              </MenuList>
            </ClickAwayListener>
          </Paper>
        </Grow>
      )}
    </StyledPopper>
  )
}
