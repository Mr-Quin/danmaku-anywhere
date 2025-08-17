import type { PopperProps } from '@mui/material'
import { Fade } from '@mui/material'
import type { useDrag } from '@use-gesture/react'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'

import type { DraggableContainerMethods } from '@/content/controller/ui/components/DraggableContainer'
import { DraggableContainer } from '@/content/controller/ui/components/DraggableContainer'
import { WindowPaneLayout } from '@/content/controller/ui/floatingPanel/layout/WindowPaneLayout'

interface RenderProps {
  bind: ReturnType<typeof useDrag>
  isDragging: boolean
}

interface PopperWindowProps {
  anchorEl: PopperProps['anchorEl']
  children: (props: RenderProps) => ReactElement<unknown, string>
  open: boolean
  unmountOnExit?: boolean
}

export const WindowPopper = ({
  anchorEl,
  children,
  open,
  unmountOnExit,
}: PopperWindowProps) => {
  const methods = useRef<DraggableContainerMethods>(null)

  useEffect(() => {
    if (open) {
      void methods.current?.resetOffset()
    }
  }, [open])

  return (
    <DraggableContainer
      anchorEl={anchorEl}
      initialOffset={{ x: 0, y: 12 }}
      sx={{
        pointerEvents: open ? 'auto' : 'none',
      }}
      ref={methods}
    >
      {({ bind, isDragging }) => {
        return (
          <Fade in={open} unmountOnExit={unmountOnExit}>
            <div>
              <WindowPaneLayout>
                {children({ bind, isDragging })}
              </WindowPaneLayout>
            </div>
          </Fade>
        )
      }}
    </DraggableContainer>
  )
}
