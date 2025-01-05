import { useMatchMountConfig } from '@/common/options/mountConfig/useMatchMountConfig'

/**
 * Suspends
 */
export const useActiveConfig = () => {
  const config = useMatchMountConfig(window.location.href)

  if (!config) {
    throw new Error('No active config found, config may have been disabled.')
  }

  return config
}
