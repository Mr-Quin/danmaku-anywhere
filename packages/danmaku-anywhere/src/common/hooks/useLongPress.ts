import { useDrag } from '@use-gesture/react'

interface LongPressProps {
  event: TouchEvent | MouseEvent | PointerEvent
  xy: [number, number]
}

interface UseLongPressOptions {
  threshold?: number
  onLongPress: (props: LongPressProps) => void
}

export const useLongPress = ({
  onLongPress,
  threshold = 500,
}: UseLongPressOptions) => {
  const bind = useDrag(
    ({ down, cancel, event, xy }) => {
      if (down && !(event instanceof KeyboardEvent)) {
        onLongPress({ event, xy })
        cancel()
      }
    },
    {
      delay: threshold,
      filterTaps: true,
      threshold: 10,
    }
  )
  return bind
}
