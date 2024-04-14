import { MenuOpen, Refresh } from '@mui/icons-material'
import type { FabProps, PopoverVirtualElement } from '@mui/material'
import {
  Box,
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
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'

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

  const handleOpen: MouseEventHandler<HTMLElement> = (e) => {
    const virtualElement = {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: e.clientX,
        y: e.clientY,
        top: e.clientY,
        right: e.clientX,
        bottom: e.clientY,
        left: e.clientX,
        toJSON: () => ({}),
      }),
      nodeType: Node.ELEMENT_NODE,
    }
    onOpen(virtualElement)
  }

  const handleContextMenu: MouseEventHandler<HTMLElement> = (e) => {
    if (isOpen) {
      return
    }
    e.preventDefault()
    handleOpen(e)
  }

  const { refreshComments } = useRefreshComments()

  const fabRef = useRef<HTMLButtonElement>(null)

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
              ref: fabRef,
            }}
            ref={ref}
          >
            <SpeedDialAction
              icon={<Refresh />}
              tooltipTitle="Refresh danmaku"
              onClick={refreshComments}
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
