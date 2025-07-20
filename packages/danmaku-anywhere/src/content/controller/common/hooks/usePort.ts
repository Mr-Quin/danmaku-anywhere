import { useEffect } from 'react'
import { portNames } from '@/common/ports/portNames'
import { useStore } from '@/content/controller/store/store'

const port = chrome.runtime.connect({
  name: portNames.contentPing,
})

export const usePort = () => {
  const setDisconnected = useStore.use.setIsDisconnected()

  useEffect(() => {
    const handleDisconnect = () => {
      // setDisconnected(true)
      // Logger.warn('Extension context disconnected.')
    }

    port.onDisconnect.addListener(handleDisconnect)

    return () => {
      port.onDisconnect.removeListener(handleDisconnect)
    }
  }, [setDisconnected])
}
