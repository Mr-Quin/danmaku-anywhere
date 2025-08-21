import { useEffect } from 'react'
import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { useMatchMountConfig } from '@/common/options/mountConfig/useMatchMountConfig'

/**
 * Suspends
 */
export const useActiveConfig = () => {
  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (!config) {
      getTrackingService().track('noActiveConfig')
    }
  }, [config])

  return config || null
}
