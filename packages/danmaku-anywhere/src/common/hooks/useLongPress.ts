import {
  type MouseEvent,
  type TouchEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

interface UseLongPressOptions {
  threshold?: number
  onLongPress: (event: TouchEvent | MouseEvent) => void
}

export const useLongPress = ({
  onLongPress,
  threshold = 500,
}: UseLongPressOptions) => {
  const [startLongPress, setStartLongPress] = useState(false)
  const [event, setEvent] = useState<TouchEvent | MouseEvent>()

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined
    if (startLongPress && event) {
      timerId = setTimeout(() => {
        onLongPress(event)
      }, threshold)
    } else {
      clearTimeout(timerId)
    }

    return () => {
      clearTimeout(timerId)
    }
  }, [startLongPress, onLongPress, threshold, event])

  const bind = useMemo(() => {
    const start = (event: TouchEvent | MouseEvent) => {
      setStartLongPress(true)
      setEvent(event)
    }

    const stop = () => {
      setStartLongPress(false)
      setEvent(undefined)
    }

    return {
      onMouseDown: (e: MouseEvent) => start(e),
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: (e: TouchEvent) => start(e),
      onTouchEnd: stop,
      onTouchMove: stop,
    }
  }, [setStartLongPress, setEvent])

  return bind
}
