import { useEffect } from 'react'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'

export const useIconManager = () => {
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
}
