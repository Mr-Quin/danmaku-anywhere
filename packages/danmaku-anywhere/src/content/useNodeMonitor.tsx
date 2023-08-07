import { useEffect, useState } from 'react'

export const useNodeMonitor = <T extends HTMLElement>(selector?: string) => {
  const [node, setNode] = useState<T | null>(null)

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
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
              // stop at the first match
              setNode(node as T)
              break
            }
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (removedNode instanceof HTMLElement) {
            // contentLogger.log('comparing node', node)
            if (
              removedNode === node ||
              removedNode.contains(node) ||
              removedNode.matches(selector)
            ) {
              setNode(null)
              break
            }
          }
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
  }, [selector])

  return node
}
