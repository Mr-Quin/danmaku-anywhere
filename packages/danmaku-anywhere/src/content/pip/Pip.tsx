import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { moveElement } from '@/content/pip/pipUtils'
import { useDanmakuManager } from '@/content/store/danmakuManager'
import { useStore } from '@/content/store/store'

const manager = useDanmakuManager.getState().manager

export const Pip = () => {
  const pip = useStore((state) => state.pip)
  const exitPip = useStore((state) => state.exitPip)

  useEffect(() => {
    if (!pip) return
    if (!manager.video) return
    const { window: pipWindow, portal } = pip

    const delayResize = () => {
      setTimeout(() => {
        manager.resize()
      }, 100)
    }

    const restoreWrapper = moveElement(manager.wrapper, portal)
    const restoreVideo = moveElement(manager.video, pipWindow.document.body)

    delayResize()

    pipWindow.addEventListener('pagehide', () => {
      exitPip()
      restoreVideo()
      restoreWrapper()
      delayResize()
    })
  }, [pip])

  if (!pip?.portal) return null

  return createPortal(<></>, pip.portal)
}
