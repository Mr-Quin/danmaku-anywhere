import { useEffect, useState } from 'react'
import { DanmakuManager } from './DanmakuManager'
import { useMessageListener } from '@/common/hooks/useMessages'

export const useSelector = () => {
  const [isEnabled, setIsEnabled] = useState(false)

  useMessageListener((request: any) => {
    if (request.action === 'startSelector') {
      // start the inspector mode
      console.log('start inspector')
      setIsEnabled(true)
    }
  })

  // cancel the selector on escape
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEnabled(false)
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [isEnabled])

  return { isEnabled, disableSelector: () => setIsEnabled(false) }
}

export const useNodeMonitor = <T extends HTMLElement>(selector: string) => {
  const [node, setNode] = useState<T>()

  useEffect(() => {
    const current = document.querySelector(selector) as T

    if (current) {
      setNode(current)
      return
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
              // stop at the first match
              setNode(node as T)
              return
            }
          }
        }

        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) {
              setNode(undefined)
              return
            }
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }, [selector])

  return node
}

export const Content = () => {
  return (
    <>
      <DanmakuManager />
      {/*<DomSelector enable={isEnabled} onSelect={onSelect} />*/}
    </>
  )
}
