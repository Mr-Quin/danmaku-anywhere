import { useEffect } from 'react'
import { useDanmakuManager } from './useDanmakuManager'
import { useMediaObserver } from './hooks/useMediaObserver'
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
  useMediaObserver()

  return <Toast />
}
