import type { PopperProps } from '@mui/material'
import { Popper } from '@mui/material'
import { useDrag } from '@use-gesture/react'
import {
  type ReactElement,
  type Ref,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

interface RenderProps {
  bind: ReturnType<typeof useDrag>
  isDragging: boolean
}

export interface DraggableContainerMethods {
  resetOffset: () => void
}

interface DraggableContainerProps {
  anchorEl: PopperProps['anchorEl']
  children: (props: RenderProps) => ReactElement<unknown, string>
  sx?: PopperProps['sx']
  initialOffset: DragOffset
  ref?: Ref<DraggableContainerMethods>
  onTap?: (event: PointerEvent) => void
  onDragEnd?: (offset: DragOffset) => void
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

export const DraggableContainer = ({
  anchorEl,
  children,
  sx,
  initialOffset,
  ref,
  onTap,
  onDragEnd,
}: DraggableContainerProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [popperInst, setPopperInst] = useState<PopperInstance | null>(null)
  const translate = useRef(initialOffset)
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

  const resetOffset = () => {
    void updatePosition(initialOffset.x, initialOffset.y)
  }

  useImperativeHandle(
    ref,
    () => ({
      resetOffset,
    }),
    [resetOffset]
  )

  useEffect(() => {
    if (!popperInst) {
      return
    }
    // apply the initial offset
    void updatePosition(translate.current.x, translate.current.y)
  }, [popperInst])

  const bind = useDrag(
    ({ down, tap, event, delta: [mx, my] }) => {
      if (tap) {
        onTap?.(event as PointerEvent)
      }
      if (down) {
        setIsDragging(true)
        void updatePosition(translate.current.x + mx, translate.current.y - my)
      } else {
        setIsDragging(false)
        onDragEnd?.({ x: translate.current.x, y: translate.current.y })
      }
    },
    { delay: 1000 }
  )

  return (
    <Popper
      open={true}
      anchorEl={anchorEl}
      popperRef={setPopperInst}
      placement="top-start"
      sx={{
        zIndex: 1402,
        userSelect: isDragging ? 'none' : 'auto',
        willChange: 'transform',
        ...sx,
      }}
    >
      {children({ bind, isDragging })}
    </Popper>
  )
}
