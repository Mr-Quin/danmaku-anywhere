import { FunctionalComponent, Ref, VNode } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

interface ClickawayListenerProps {
  onClickaway: (event: MouseEvent) => void
  children: (ref: Ref<Element>) => VNode
}

export const ClickawayListener: FunctionalComponent<ClickawayListenerProps> = ({
  onClickaway,
  children,
}) => {
  const containerRef = useRef<Element>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClickaway(event)
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [onClickaway])

  return children(containerRef)
}
