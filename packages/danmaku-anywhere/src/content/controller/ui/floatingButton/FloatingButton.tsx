import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  ClickAwayListener,
  Fab,
  Fade,
  SpeedDialIcon,
  styled,
} from '@mui/material'
import type { MouseEventHandler } from 'react'
import { forwardRef, useRef, useState } from 'react'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'
import { createVirtualElement } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'
import { DraggableContainer } from '@/content/controller/ui/DraggableContainer'
import { FabContextMenu } from '@/content/controller/ui/floatingButton/components/FabContextMenu'
import { FabLoadingIndicator } from '@/content/controller/ui/floatingButton/components/FabLoadingIndicator'
import { LoadingRing } from './components/LoadingRing'
import { useShowFab } from './hooks/useShowFab'

interface FloatingButtonProps extends FabProps {
  onOpen: (virtualElement: PopoverVirtualElement) => void
  isOpen: boolean
}

const StyledFab = styled(Fab, {
  shouldForwardProp: (prop) => prop !== 'hover',
})<{ hover: boolean }>(({ hover }) => {
  return {
    transition: 'transform 0.2s ease-in-out',
    transform: hover ? 'rotate(45deg)' : 'rotate(0deg)',
    touchAction: 'none',
  }
})

const useInitialAnchor = () => {
  // bottom 12, left 3
  const left = 24
  const bottom = window.innerHeight - 96

  return useRef(createVirtualElement(left, bottom))
}

export const FloatingButton = forwardRef<
  HTMLButtonElement,
  FloatingButtonProps
>(({ onOpen, isOpen }: FloatingButtonProps, ref) => {
  const isLoading = useAnyLoading()

  const showFab = useShowFab()

  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<PopoverVirtualElement | null>(null)
  const [fabHover, setFabHover] = useState(false)

  const { isMounted, isVisible } = useStore.use.danmaku()

  const fabAnchor = useInitialAnchor()

  const handleTap = (x: number, y: number) => {
    handleCloseContextMenu()
    const virtualElement = createVirtualElement(x, y)
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

  const fabRef = useRef<HTMLButtonElement>(null)

  const mergedFabRefs = useMergeRefs(fabRef, ref)

  const dialColor = !isVisible ? undefined : isMounted ? 'success' : 'primary'

  const isIn = showFab || isOpen || !!contextMenuAnchor

  return (
    <ClickAwayListener onClickAway={handleCloseContextMenu}>
      <div>
        <DraggableContainer
          anchorEl={fabAnchor.current}
          initialOffset={{ x: 0, y: 0 }}
          sx={{
            zIndex: 1401,
          }}
          onTap={(e) => {
            handleTap(e.clientX, e.clientY)
          }}
        >
          {({ bind }) => {
            return (
              <Fade
                in={isIn}
                unmountOnExit={false}
                style={{
                  pointerEvents: isIn ? 'auto' : 'none',
                }}
              >
                <div
                  {...bind()}
                  style={{
                    touchAction: 'none',
                  }}
                >
                  <StyledFab
                    size="small"
                    onContextMenu={handleContextMenu}
                    ref={mergedFabRefs}
                    color={dialColor}
                    hover={fabHover}
                    onMouseOver={() => setFabHover(true)}
                    onMouseOut={() => setFabHover(false)}
                  >
                    <SpeedDialIcon />
                    <LoadingRing isLoading={isLoading} />
                  </StyledFab>
                  {fabRef.current && (
                    <FabLoadingIndicator
                      anchor={fabRef.current}
                      isLoading={isLoading}
                    />
                  )}
                </div>
              </Fade>
            )
          }}
        </DraggableContainer>
        <FabContextMenu
          open={contextMenuAnchor !== null}
          anchorEl={contextMenuAnchor}
          sx={{ zIndex: 1402 }}
        />
      </div>
    </ClickAwayListener>
  )
})

FloatingButton.displayName = 'FloatingButton'
