import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  ClickAwayListener,
  Box,
  Fade,
  SpeedDial,
  SpeedDialIcon,
} from '@mui/material'
import type { MouseEventHandler } from 'react'
import { forwardRef, useRef, useState } from 'react'

import { LoadingRing } from './components/LoadingRing'
import { useShowFab } from './hooks/useShowFab'

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'
import { createVirtualElement } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import { FabContextMenu } from '@/content/controller/ui/floatingButton/components/FabContextMenu'
import { FabLoadingIndicator } from '@/content/controller/ui/floatingButton/components/FabLoadingIndicator'

interface FloatingButtonProps extends FabProps {
  onOpen: (virtualElement: PopoverVirtualElement) => void
  isOpen: boolean
}

export const FloatingButton = forwardRef<
  HTMLButtonElement,
  FloatingButtonProps
>(({ onOpen, isOpen }: FloatingButtonProps, ref) => {
  const isLoading = useAnyLoading()

  const showFab = useShowFab()

  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<PopoverVirtualElement | null>(null)

  const { isMounted, isVisible } = useStore.use.danmaku()

  const handleOpen: MouseEventHandler<HTMLElement> = (e) => {
    const virtualElement = createVirtualElement(e.clientX, e.clientY)
    onOpen(virtualElement)
  }

  const handleCloseContextMenu = () => {
    setContextMenuAnchor(null)
  }

  const handleContextMenu: MouseEventHandler<HTMLElement> = (e) => {
    if (contextMenuAnchor) {
      // if context menu is already open, use the system context menu
      handleCloseContextMenu()
      return
    }
    e.preventDefault()
    const virtualElement = createVirtualElement(e.clientX, e.clientY)
    setContextMenuAnchor(virtualElement)
  }

  // reserved for touch devices
  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    handleOpen(e)
    handleCloseContextMenu()
  }

  const fabRef = useRef<HTMLButtonElement>(null)

  const mergedFabRefs = useMergeRefs(fabRef, ref)

  const dialColor = !isVisible
    ? 'text.disabled'
    : isMounted
      ? 'success.main'
      : 'primary.main'

  return (
    <ClickAwayListener onClickAway={handleCloseContextMenu}>
      <Box>
        <Fade in={isLoading || showFab || isOpen || !!contextMenuAnchor}>
          <div>
            <SpeedDial
              ariaLabel="SpeedDial"
              icon={<SpeedDialIcon />}
              FabProps={{
                size: 'small',
                children: <LoadingRing isLoading />,
                onContextMenu: handleContextMenu,
                onClick: handleClick,
                ref: mergedFabRefs,
                sx: {
                  bgcolor: dialColor,
                },
              }}
            />
            {fabRef.current && (
              <FabLoadingIndicator
                anchor={fabRef.current}
                isLoading={isLoading}
              />
            )}
            <FabContextMenu
              open={contextMenuAnchor !== null}
              anchorEl={contextMenuAnchor}
            />
          </div>
        </Fade>
      </Box>
    </ClickAwayListener>
  )
})

FloatingButton.displayName = 'FloatingButton'
