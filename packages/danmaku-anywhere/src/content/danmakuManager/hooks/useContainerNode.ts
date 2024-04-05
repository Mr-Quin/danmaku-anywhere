import { useEffect, useRef } from 'react'

import { useMediaElementStore } from '../../store/mediaElementStore'

export const useContainerNode = () => {
  const containerNode = useRef<HTMLDivElement>(null)
  const setContainerNode = useMediaElementStore(
    (state) => state.setContainerNode
  )

  useEffect(() => {
    setContainerNode(containerNode.current)
  }, [setContainerNode, containerNode.current])

  return containerNode
}
