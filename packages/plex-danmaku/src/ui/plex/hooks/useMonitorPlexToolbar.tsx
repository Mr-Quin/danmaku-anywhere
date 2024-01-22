import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

import { logger } from '@/utils/logger'

const getMountRoot = () =>
  document.querySelector(
    "div[class='PlayerControls-buttonGroupCenter-LDbSmK PlayerControls-buttonGroup-L3xlI0 PlayerControls-balanceLeft-jE50ih']"
  )

const plexControlBarClass = 'AudioVideoFullPlayer-bottomBar-h224iE'

// use an observer to detect when the control bar is added or removed
export const useMonitorPlexToolbar = () => {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  const refNode = useRef<HTMLElement | null>(null)

  const observer = useMemo(() => {
    return new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // we do a manual loop here because we need to set the type as HTMLElement
          if (node instanceof HTMLElement) {
            if (node.classList.contains(plexControlBarClass)) {
              refNode.current = node
              // we assume that mount point should exist at this point
              const mountPoint = getMountRoot()

              if (!mountPoint) {
                logger.error('Mount point not found, aborting')
                logger.error('Possibly the class name has changed')
                return
              }

              setRoot(mountPoint as HTMLElement)
            }
          }
        }

        const removedNodes = Array.from(mutation.removedNodes)
        if (
          removedNodes.includes(refNode.current as Node) ||
          removedNodes.some((node) => node.contains(refNode.current))
        ) {
          refNode.current = null
          setRoot(null)
        }
      }
    })
  }, [])

  useEffect(() => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return root
}
