import { useCallback, useEffect, useRef, useState } from 'react'

export const useNodeMonitor = <T extends HTMLElement>(selector?: string) => {
  const [node, setNode] = useState<T | null>(null)

  // use a weak ref to avoid memory leaks when the node is removed
  // for the node state, assume the mutation observer will handle setting it to null when the node is removed
  const nodeRef = useRef<WeakRef<T>>()

  const handleSetNode = useCallback(
    (node: T | null) => {
      if (node) {
        nodeRef.current = new WeakRef(node)
      }
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
      // label for breaking out of nested loops
      for (const mutation of mutations) {
        // check added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
              // stop at the first match
              handleSetNode(node as T)
              break
            }
          }
        }

        // check attribute changes
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement
          if (target.matches(selector)) {
            handleSetNode(target as T)
            break
          }
          // if the node is removed
          if (target === nodeRef.current?.deref()) {
            handleSetNode(null)
            break
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (removedNode instanceof HTMLElement) {
            if (
              removedNode === nodeRef.current?.deref() ||
              removedNode.contains(node) ||
              removedNode.matches(selector)
            ) {
              handleSetNode(null)
              break
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
