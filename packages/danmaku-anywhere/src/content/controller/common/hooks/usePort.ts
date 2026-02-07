import { useEffect } from 'react'
import { connectRuntimePort } from '@/common/extension/chromeRuntime'
import { portNames } from '@/common/ports/portNames'
import { useStore } from '@/content/controller/store/store'

const port = connectRuntimePort(portNames.contentPing)

export const usePort = () => {
  const setDisconnected = useStore.use.setIsDisconnected()

  useEffect(() => {
    const handleDisconnect = () => {
      // setDisconnected(true)
      // Logger.warn('Extension context disconnected.')
    }

    if (!port) return
    port.onDisconnect.addListener(handleDisconnect)

    return () => {
      port.onDisconnect.removeListener(handleDisconnect)
    }
  }, [setDisconnected])
}
