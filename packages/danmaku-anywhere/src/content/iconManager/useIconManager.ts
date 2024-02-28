import { useEffect } from 'react'

import type { MountConfig } from '@/common/constants/mountConfig'
import { iconMessage } from '@/common/messages/iconMessage'

export const useIconManager = (config: MountConfig) => {
  useEffect(() => {
    if (config) {
      iconMessage.set({ state: 'available' })
    } else {
      iconMessage.set({ state: 'unavailable' })
    }
  }, [config])
}
