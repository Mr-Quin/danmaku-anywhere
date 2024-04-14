import {
  MenuOpen,
  Refresh,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  Box,
  CircularProgress,
  Fade,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material'
import type { MouseEventHandler } from 'react'
import { forwardRef, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LoadingRing } from './components/LoadingRing'
import { useShowFab } from './hooks/useShowFab'

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'
import { createVirtualElement } from '@/common/utils/utils'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
import { useStore } from '@/content/store/store'

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

  const { refreshComments, isPending, canRefresh } = useRefreshComments()

  const enabled = useStore((state) => state.enabled)
  const toggleEnabled = useStore((state) => state.toggleEnabled)

  const handleOpen: MouseEventHandler<HTMLElement> = (e) => {
    const virtualElement = createVirtualElement(e.clientX, e.clientY)
    onOpen(virtualElement)
  }

  const handleContextMenu: MouseEventHandler<HTMLElement> = (e) => {
    if (isOpen) {
      return
    }
    e.preventDefault()
    handleOpen(e)
  }

  // reserved for touch devices
  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    handleOpen(e)
  }

  const fabRef = useRef<HTMLButtonElement>(null)

  const mergedFabRefs = useMergeRefs(fabRef, ref)

  return (
    <Box>
      <Fade in={isLoading || showFab || isOpen}>
        <div>
          <SpeedDial
            ariaLabel="SpeedDial playground example"
            icon={<SpeedDialIcon />}
            FabProps={{
              size: 'small',
              children: <LoadingRing isLoading />,
              onContextMenu: handleContextMenu,
              onClick: handleClick,
              ref: mergedFabRefs,
            }}
          >
            <SpeedDialAction
              icon={
                isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Refresh />
                )
              }
              tooltipTitle="Refresh danmaku"
              onClick={refreshComments}
              FabProps={{
                disabled: isPending || !canRefresh,
              }}
            />
            <SpeedDialAction
              icon={enabled ? <Visibility /> : <VisibilityOff />}
              tooltipTitle={enabled ? 'Disable danmaku' : 'Enable danmaku'}
              onClick={() => toggleEnabled()}
            />
            <SpeedDialAction
              icon={<MenuOpen />}
              tooltipTitle="Open popup"
              onClick={handleOpen}
            />
          </SpeedDial>
          {fabRef.current &&
            createPortal(
              <Fade in={isLoading}>
                <Box
                  position="absolute"
                  width={40}
                  height={40}
                  top={0}
                  left={0}
                  sx={{
                    pointerEvents: 'none',
                  }}
                >
                  <LoadingRing isLoading={isLoading} />
                </Box>
              </Fade>,
              fabRef.current
            )}
        </div>
      </Fade>
    </Box>
  )
})

FloatingButton.displayName = 'FloatingButton'
