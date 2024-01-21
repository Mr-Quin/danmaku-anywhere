import { useEffect } from 'react'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { iconMessage } from '@/common/messages/iconMessage'

export const useIconManager = () => {
  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (config) {
      iconMessage.set({ state: 'available' })
    } else {
      iconMessage.set({ state: 'unavailable' })
    }
  }, [config])
}
