import { useState, useEffect, useRef } from 'preact/hooks'
import { logger } from '@/utils/logger'

// we monitor this class because it changes when the video is minimized
const plexVideoContainerFullscreenClass = 'Player-fullPlayerContainer-wBDz23'

// use an observer to detect when the control bar is added or removed
export const useMonitorPlexPlayer = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [media, setMedia] = useState<HTMLMediaElement | null>(null)
  const [fullScreen, setFullScreen] = useState(true)

  const [monitorNode, setMonitorNode] = useState<HTMLElement | null>(null)
  const monitorNodeRef = useRef<HTMLElement | null>(null)

  // look for the plex player
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // we do a manual loop here because we need to set the type as HTMLElement
          if (node instanceof HTMLElement) {
            if (node.nodeName === 'VIDEO') {
              logger.debug('Plex video player found')
              setMedia(node as HTMLMediaElement)
              monitorNodeRef.current = node
              const container = node.parentNode!.parentNode as HTMLElement
              setContainer(container)
              setMonitorNode(container)
              return
            }
          }
        }

        const removedNodes = Array.from(mutation.removedNodes)
        if (
          removedNodes.includes(monitorNodeRef.current as Node) ||
          removedNodes.some((node) => node.contains(monitorNodeRef.current))
        ) {
          logger.debug('Plex video player removed')
          setMonitorNode(null)
          setMedia(null)
          monitorNodeRef.current = null
          setContainer(null)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // check for the video player minimized/fullscreen
  useEffect(() => {
    if (!monitorNode) return

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement
          const isFullScreen = target.classList.contains(
            plexVideoContainerFullscreenClass
          )

          logger.debug(
            `Plex video player changed to ${
              isFullScreen ? 'fullscreen' : 'minimized'
            }`
          )

          setFullScreen(isFullScreen)

          return
        }
      }
    })

    observer.observe(monitorNode, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
    }
  }, [monitorNode])

  return [container, media, fullScreen] as const
}
