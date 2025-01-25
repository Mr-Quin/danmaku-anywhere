import type { PopperProps } from '@mui/material'
import { Drawer, Fade, Popper } from '@mui/material'
import { useDrag } from '@use-gesture/react'
import type { ReactElement, RefObject } from 'react'
import { useState, useEffect, useRef } from 'react'

import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { WindowPaneLayout } from '@/content/controller/ui/floatingPanel/layout/WindowPaneLayout'

interface RenderProps {
  bind: ReturnType<typeof useDrag>
  isDragging: boolean
}

interface PopperWindowProps {
  anchorEl: PopperProps['anchorEl']
  children: (props: RenderProps) => ReactElement<unknown, string>
  open: boolean
}

type RefOf<T> = T extends RefObject<infer U> ? U : never

type PopperInstance = RefOf<Exclude<PopperProps['popperRef'], undefined>>

const popperModifiers = [
  {
    name: 'offset',
    options: {
      offset: [0, 12],
    },
  },
  {
    name: 'flip',
    enabled: false,
    options: {
      altBoundary: false,
      rootBoundary: 'viewport',
      padding: 8,
    },
  },
  {
    name: 'preventOverflow',
    enabled: true,
    options: {
      altAxis: true,
      altBoundary: false,
      tether: false,
      rootBoundary: 'viewport',
      padding: 8,
    },
  },
]

export const PopperWindow = ({
  anchorEl,
  children,
  open,
}: PopperWindowProps) => {
  const sm = useIsSmallScreen()

  const [isDragging, setIsDragging] = useState(false)
  const [popperInst, setPopperInst] = useState<PopperInstance | null>(null)
  const translate = useRef({ x: 0, y: 12 })
  const modifierRef = useRef(popperModifiers)

  const updatePosition = async (x: number, y: number) => {
    if (!popperInst) return

    translate.current.x = x
    translate.current.y = y
    modifierRef.current[0].options.offset = [
      translate.current.x,
      translate.current.y,
    ]

    await popperInst.setOptions((options) => {
      return {
        ...options,
        modifiers: modifierRef.current,
      }
    })
    const state = await popperInst.update()

    // When overflowing, the translate values will not reflect the actual position, so we need to adjust it by the overflow amount
    if (state.modifiersData?.preventOverflow) {
      translate.current.x += state.modifiersData.preventOverflow.x
      translate.current.y -= state.modifiersData.preventOverflow.y
    }
  }

  useEffect(() => {
    if (open) {
      void updatePosition(0, 12)
    }
  }, [open, popperInst])

  const bind = useDrag(
    ({ down, delta: [mx, my] }) => {
      if (down) {
        setIsDragging(true)
        void updatePosition(translate.current.x + mx, translate.current.y - my)
      } else {
        setIsDragging(false)
      }
    },
    { delay: 1000, enabled: !sm }
  )

  if (sm) {
    return (
      <Drawer anchor="bottom" open={open} hideBackdrop sx={{ zIndex: 1402 }}>
        <WindowPaneLayout>{children({ bind, isDragging })}</WindowPaneLayout>
      </Drawer>
    )
  }

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      transition
      popperRef={setPopperInst}
      placement="top-start"
      sx={{
        zIndex: 1402, // 1 above the floating button
        userSelect: isDragging ? 'none' : 'auto',
        willChange: 'transform',
      }}
    >
      {({ TransitionProps }) => {
        return (
          <Fade {...TransitionProps}>
            <WindowPaneLayout>
              {children({ bind, isDragging })}
            </WindowPaneLayout>
          </Fade>
        )
      }}
    </Popper>
  )
}
