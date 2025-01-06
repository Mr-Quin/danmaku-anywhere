import { useEffect } from 'react'

import { IS_EXTERNALLY_CONNECTABLE } from '@/common/constants'
import { usePopup } from '@/content/controller/store/popupStore'

export const useExternalConnection = () => {
  const toggleOpen = usePopup.use.toggleOpen()

  useEffect(() => {
    if (!IS_EXTERNALLY_CONNECTABLE) return

    // accept message from window for onboarding workflow
    const windowMessageHandler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== 'danmaku-anywhere') return
      switch (event.data?.method) {
        case 'hello':
          window.postMessage({ type: 'danmaku-anywhere', method: 'ok' }, '*')
          break
        case 'openPopup':
          toggleOpen(true)
          break
      }
    }

    window.addEventListener('message', windowMessageHandler)

    return () => {
      window.removeEventListener('message', windowMessageHandler)
    }
  }, [toggleOpen])
}
