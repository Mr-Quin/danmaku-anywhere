import { useEffect } from 'react'
import { useDanmakuManager } from './useDanmakuManager'
import { usePlexTitle } from './integration/plex/usePlexTitle'
import { Toast } from './Toast'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'

export const Content = () => {
  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (config) {
      chrome.runtime.sendMessage({
        action: 'setIcon/available',
      })
    } else {
      chrome.runtime.sendMessage({
        action: 'setIcon/unavailable',
      })
    }
  }, [config])

  useDanmakuManager()
  usePlexTitle()

  return <Toast />
}
