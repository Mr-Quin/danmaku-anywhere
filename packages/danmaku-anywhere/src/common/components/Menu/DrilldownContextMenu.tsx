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
import { createVirtualElement } from '@/common/utils/utils'

const StyledPopper = styled(Popper)({
  zIndex: 1403,
})

const FALLBACK_PLACEMENTS = [
  'top-start',
  'right-start',
  'left-start',
  'left-end',
]

const PLACEMENT_TO_TRANSFORM_ORIGIN: Record<string, string> = {
  'bottom-start': 'left top',
  'bottom-end': 'right top',
  'top-start': 'left bottom',
  'top-end': 'right bottom',
  'right-start': 'left top',
  'right-end': 'left bottom',
  'left-start': 'right top',
  'left-end': 'right bottom',
} as const

function calculateTransformOrigin(placement: string): string {
  return PLACEMENT_TO_TRANSFORM_ORIGIN[placement] || 'right top'
}

export interface DrilldownContextMenuProps extends PropsWithChildren {
  anchorEl?: HTMLElement | null
  anchorPosition?: { top: number; left: number } | null
  open: boolean
  onClose: () => void
  items?: DAMenuItemConfig[]
  dense?: boolean
  PaperProps?: Partial<PaperProps>
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
}: DrilldownContextMenuProps): ReactElement => {
  const finalAnchor = useMemo(() => {
    if (anchorEl) {
      return anchorEl
    }
    if (!anchorPosition) {
      return null
    }
    return createVirtualElement(anchorPosition.left, anchorPosition.top)
  }, [anchorPosition, anchorEl])

  return (
    <StyledPopper
      open={open && Boolean(finalAnchor)}
      anchorEl={finalAnchor}
      placement="bottom-start"
      transition
      modifiers={[
        {
          name: 'preventOverflow',
          options: {
            altAxis: true,
            tether: false,
          },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: FALLBACK_PLACEMENTS,
          },
        },
      ]}
    >
      {({ TransitionProps, placement }) => {
        const transformOrigin = calculateTransformOrigin(placement)
        return (
          <Grow {...TransitionProps} style={{ transformOrigin }}>
            <Paper elevation={8} {...PaperProps}>
              <ClickAwayListener onClickAway={onClose}>
                <MenuList autoFocusItem={false} dense={dense}>
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
        )
      }}
    </StyledPopper>
  )
}
