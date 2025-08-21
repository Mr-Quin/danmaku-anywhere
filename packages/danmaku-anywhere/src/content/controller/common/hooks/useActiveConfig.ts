import { useMatchMountConfig } from '@/common/options/mountConfig/useMatchMountConfig'

/**
 * Suspends
 */
export const useActiveConfig = () => {
  const config = useMatchMountConfig(window.location.href)

  return config || null
}
