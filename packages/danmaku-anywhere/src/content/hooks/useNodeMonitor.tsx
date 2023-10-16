import { useCallback, useEffect, useRef, useState } from 'react'

export const useNodeMonitor = <T extends HTMLElement>(selector?: string) => {
  const [node, setNode] = useState<T | null>(null)

  const nodeRef = useRef<T | null>(null)

  const handleSetNode = useCallback(
    (node: T | null) => {
      nodeRef.current = node
      setNode(node)
    },
    [setNode]
  )

  useEffect(() => {
    if (!selector) {
      setNode(null)
      return
    }

    const current = document.querySelector(selector) as T

    if (current) {
      setNode(current)
    }

    const observer = new MutationObserver((mutations) => {
      mutationLoop: for (const mutation of mutations) {
        // check added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
              // stop at the first match
              handleSetNode(node as T)
              break mutationLoop
            }
          }
        }

        // check attribute changes
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement
          if (target.matches(selector)) {
            handleSetNode(target as T)
            break mutationLoop
          }
          // if the node is removed
          if (target === nodeRef.current) {
            handleSetNode(null)
            break mutationLoop
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (removedNode instanceof HTMLElement) {
            if (
              removedNode === nodeRef.current ||
              removedNode.contains(node) ||
              removedNode.matches(selector)
            ) {
              handleSetNode(null)
              break mutationLoop
            }
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'],
    })

    return () => {
      observer.disconnect()
    }
  }, [selector, handleSetNode])

  return node
}
