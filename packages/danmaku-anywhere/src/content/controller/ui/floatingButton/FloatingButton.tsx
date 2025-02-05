import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  Box,
  ClickAwayListener,
  Fade,
  SpeedDial,
  SpeedDialIcon,
} from '@mui/material'
import { useDrag } from '@use-gesture/react'
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

  const translate = useRef({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const bind = useDrag(
    ({ down, tap, delta: [mx, my], event }) => {
      if (tap) {
        handleCloseContextMenu()
        const virtualElement = createVirtualElement(
          (event as PointerEvent).clientX,
          (event as PointerEvent).clientY
        )
        onOpen(virtualElement)
      }
      if (down && buttonRef.current) {
        translate.current.x += mx
        translate.current.y += my
        buttonRef.current.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px)`
      }
    },
    { delay: 200 }
  )

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

  const fabRef = useRef<HTMLButtonElement>(null)

  const mergedFabRefs = useMergeRefs(fabRef, ref)

  const dialColor = !isVisible
    ? 'text.disabled'
    : isMounted
      ? 'success.main'
      : 'primary.main'

  const isIn = isLoading || showFab || isOpen || !!contextMenuAnchor

  return (
    <ClickAwayListener onClickAway={handleCloseContextMenu}>
      <Fade
        in={isIn}
        unmountOnExit={false}
        style={{
          pointerEvents: isIn ? 'auto' : 'none',
        }}
      >
        <div>
          <Box
            ref={buttonRef}
            position="fixed"
            bottom={(theme) => theme.spacing(12)}
            left={(theme) => theme.spacing(3)}
            zIndex={1401} // 1 above the snackbar
            sx={{
              willChange: 'transform',
            }}
          >
            <SpeedDial
              ariaLabel="SpeedDial"
              icon={<SpeedDialIcon />}
              FabProps={{
                size: 'small',
                children: <LoadingRing isLoading />,
                onContextMenu: handleContextMenu,
                ref: mergedFabRefs,
                sx: {
                  bgcolor: dialColor,
                  touchAction: 'none',
                },
                ...bind(),
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
              sx={{ zIndex: 1402 }}
            />
          </Box>
        </div>
      </Fade>
    </ClickAwayListener>
  )
})

FloatingButton.displayName = 'FloatingButton'
