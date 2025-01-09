import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  Box,
  useTheme,
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

  const theme = useTheme()

  const [bottom, setBottom] = useState(parseInt(theme.spacing(12), 10))
  const [left, setLeft] = useState(parseInt(theme.spacing(3), 10))

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
      if (down) {
        setBottom((prev) => prev - my)
        setLeft((prev) => prev + mx)
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

  return (
    <ClickAwayListener onClickAway={handleCloseContextMenu}>
      <Fade in={isLoading || showFab || isOpen || !!contextMenuAnchor}>
        <div>
          <Box
            position="fixed"
            bottom={`${bottom}px`}
            left={`${left}px`}
            zIndex={1401} // 1 above the snackbar
            sx={{
              touchAction: 'none',
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
