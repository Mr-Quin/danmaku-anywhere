import { useEffect, useState } from 'react'
import { DanmakuManager } from './DanmakuManager'
import { contentLogger } from '@/common/logger'

export const useNodeMonitor = <T extends HTMLElement>(selector?: string) => {
  const [node, setNode] = useState<T | null>(null)

  useEffect(() => {
    if (!selector) {
      setNode(null)
      return
    }

    contentLogger.log('useNodeMonitor', selector)
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
              contentLogger.log('found node', node)
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
              contentLogger.log('removed node', removedNode)
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
  }, [selector, node])

  return node
}

export const Content = () => {
  return (
    <>
      <DanmakuManager />
    </>
  )
}
