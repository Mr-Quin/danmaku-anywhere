import { useEffect, useRef, useState } from 'react'

import { tryCatchSync } from '@/common/utils/utils'

interface NodeMonitorOptions {
  // callback for when an error occurs
  onError?: (err: Error) => void
}

const isVideoElement = (node: Node): node is HTMLVideoElement =>
  node instanceof HTMLVideoElement
const isElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement

export const useVideoNodeMonitor = (
  selector?: string,
  options: NodeMonitorOptions = {}
) => {
  const [activeVideoElement, setActiveVideoElement] =
    useState<HTMLVideoElement | null>(null)

  const videoStack = useRef<HTMLVideoElement[]>([]).current
  const videoListeners = useRef<WeakMap<HTMLVideoElement, () => void>>(
    new WeakMap()
  ).current

  useEffect(() => {
    if (!selector) {
      setActiveVideoElement(null)
      return
    }

    const updateActiveNode = () => {
      if (videoStack.length === 0) setActiveVideoElement(null)

      // Set the active video element in this priority:
      // 1. The first video element that is playing and visible
      // 2. The first video element that is playing
      // 3. The first video element that is visible
      // 4. The first video element
      const activeVideo =
        videoStack.find((v) => !v.paused && v.checkVisibility()) ||
        videoStack.find((v) => !v.paused) ||
        videoStack.find((v) => v.checkVisibility()) ||
        videoStack[0]

      console.debug('Setting active video element', activeVideo)
      setActiveVideoElement(activeVideo)
    }

    const handeVideoNodeAdded = (node: HTMLVideoElement) => {
      // If the node is already in the stack, ignore it
      if (videoStack.includes(node)) return
      videoStack.push(node)

      updateActiveNode()

      // Listen to the play/pause events
      const listener = () => {
        updateActiveNode()
      }

      node.addEventListener('play', listener)
      node.addEventListener('pause', listener)
    }

    const handleVideoNodeRemoved = (node: HTMLVideoElement) => {
      const index = videoStack.indexOf(node)
      if (index !== -1) {
        videoStack.splice(index, 1)
      }

      updateActiveNode()

      // Remove the listener, if it exists
      const listener = videoListeners.get(node)

      if (listener) {
        node.removeEventListener('play', listener)
        node.removeEventListener('pause', listener)
      }
    }

    const [current, err] = tryCatchSync<HTMLVideoElement | null>(() =>
      document.querySelector(selector)
    )

    if (err) {
      options.onError?.(err)
      return
    }

    if (current) {
      handeVideoNodeAdded(current)
    }

    const rootObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // check added nodes
        for (const node of mutation.addedNodes) {
          if (isVideoElement(node)) {
            if (node.matches(selector)) {
              handeVideoNodeAdded(node)
            }
          } else if (isElement(node)) {
            const videoElements = node.querySelectorAll('video')
            videoElements.forEach((video) => {
              if (video.matches(selector)) {
                handeVideoNodeAdded(video)
              }
            })
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (isVideoElement(removedNode)) {
            if (videoStack.includes(removedNode)) {
              handleVideoNodeRemoved(removedNode)
            }
          } else if (removedNode instanceof HTMLElement) {
            if (videoStack.some((v) => removedNode.contains(v))) {
              videoStack.forEach((v) => {
                if (removedNode.contains(v)) {
                  handleVideoNodeRemoved(v)
                }
              })
            }
          }
        }
      }
    })

    rootObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'],
    })

    return () => {
      rootObs.disconnect()
    }
  }, [selector])

  return activeVideoElement
}
