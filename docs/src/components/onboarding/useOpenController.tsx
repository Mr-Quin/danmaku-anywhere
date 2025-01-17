import { useEffect, useRef, useState } from 'react'

export const useOpenController = (enable: boolean) => {
  const [hasController, setHasController] = useState(false)
  const hasControllerRef = useRef(hasController)

  useEffect(() => {
    const pollController = () => {
      if (hasControllerRef.current) {
        clearInterval(interval)
        return
      }
      window.postMessage({ type: 'danmaku-anywhere', method: 'hello' }, '*')
    }

    const interval = setInterval(pollController, 500)

    const listener = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== 'danmaku-anywhere') return
      if (event.data?.method === 'ok') {
        setHasController(true)
        hasControllerRef.current = true
      }
    }

    window.addEventListener('message', listener)

    return () => {
      window.removeEventListener('message', listener)
      clearInterval(interval)
    }
  }, [])

  const openPopup = () => {
    window.postMessage({ type: 'danmaku-anywhere', method: 'openPopup' }, '*')
  }

  const setExampleDanmaku = () => {
    window.postMessage(
      { type: 'danmaku-anywhere', method: 'setExampleDanmaku' },
      '*'
    )
  }

  useEffect(() => {
    if (!enable || !hasController) return

    window.postMessage({ type: 'danmaku-anywhere', method: 'openPopup' }, '*')
  }, [enable, hasController])

  return {
    hasController,
    openPopup,
    setExampleDanmaku,
  }
}
