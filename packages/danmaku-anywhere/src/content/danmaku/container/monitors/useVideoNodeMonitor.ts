import { useEffect, useState } from 'react'

import { tryCatchSync } from '@/common/utils/utils'

const isVideoElement = (node: Node): node is HTMLVideoElement =>
  node instanceof HTMLVideoElement

const isElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement

type VideoChangeListener = (video: HTMLVideoElement | null) => void

export const createVideoNodeObserver = (selector: string) => {
  const videoStack: HTMLVideoElement[] = []
  const videoListeners = new WeakMap<HTMLVideoElement, () => void>()

  let activeVideoElement: HTMLVideoElement | null = null
  const videoChangeListeners = new Set<VideoChangeListener>()

  const updateActiveNode = () => {
    if (videoStack.length === 0) {
      setActiveVideoElement(null)
      return
    }

    const activeVideo =
      videoStack.find((v) => !v.paused && v.checkVisibility()) ||
      videoStack.find((v) => !v.paused) ||
      videoStack.find((v) => v.checkVisibility()) ||
      videoStack[0]

    setActiveVideoElement(activeVideo)
  }

  const setActiveVideoElement = (video: HTMLVideoElement | null) => {
    // Prevent emitting the same video element
    if (activeVideoElement === video) return
    activeVideoElement = video
    videoChangeListeners.forEach((listener) => listener(video))
  }

  const handleVideoNodeAdded = (node: HTMLVideoElement) => {
    // Prevent adding duplicate nodes
    if (videoStack.includes(node)) return

    videoStack.push(node)

    updateActiveNode()

    const listener = () => {
      updateActiveNode()
    }

    node.addEventListener('play', listener)
    node.addEventListener('pause', listener)
    videoListeners.set(node, listener)
  }

  const isNodeInPip = (node: HTMLElement) => {
    if (!window.documentPictureInPicture?.window) return false
    return window.documentPictureInPicture.window.document.contains(node)
  }

  const handleVideoNodeRemoved = (node: HTMLVideoElement) => {
    // Check if the node is part of the picture-in-picture window
    // If so, assume it was moved to pip and don't consider it removed
    if (isNodeInPip(node)) return
    const index = videoStack.indexOf(node)
    if (index !== -1) {
      videoStack.splice(index, 1)
    }

    updateActiveNode()

    const listener = videoListeners.get(node)
    if (listener) {
      node.removeEventListener('play', listener)
      node.removeEventListener('pause', listener)
      videoListeners.delete(node)
    }
  }

  // Get the current video element
  const [current, err] = tryCatchSync<HTMLVideoElement | null>(() =>
    document.querySelector(selector)
  )

  if (err) {
    throw new Error(`Error selecting video element: ${err.message}`)
  }

  if (current) {
    handleVideoNodeAdded(current)
  }

  const rootObs = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Handle added nodes
      for (const node of mutation.addedNodes) {
        if (isVideoElement(node)) {
          if (node.matches(selector)) {
            handleVideoNodeAdded(node)
          }
        } else if (isElement(node)) {
          const videoElements = node.querySelectorAll(selector)
          videoElements.forEach((video) => {
            handleVideoNodeAdded(video as HTMLVideoElement)
          })
        }
      }

      // Handle removed nodes
      for (const removedNode of mutation.removedNodes) {
        if (isVideoElement(removedNode)) {
          if (videoStack.includes(removedNode)) {
            handleVideoNodeRemoved(removedNode)
          }
        } else if (isElement(removedNode)) {
          // If the removed node is a parent of the video element, remove the video element
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

  return {
    onActiveNodeChange(callback: VideoChangeListener) {
      videoChangeListeners.add(callback)
      callback(activeVideoElement)
    },
    cleanup() {
      rootObs.disconnect()
    },
  }
}

export const useVideoNodeMonitor = (selector?: string) => {
  const [activeVideoElement, setActiveVideoElement] =
    useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!selector) {
      setActiveVideoElement(null)
      return
    }

    const videoMonitor = createVideoNodeObserver(selector)

    videoMonitor.onActiveNodeChange(setActiveVideoElement)

    return () => {
      videoMonitor.cleanup()
    }
  }, [selector])

  return activeVideoElement
}
