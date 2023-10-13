import {
  useCurrentMountConfig,
  useMountConfig,
} from '@/common/hooks/mountConfig/useMountConfig'
import { useEffect } from 'react'

export const useConfigAvailable = () => {
  const { configs } = useMountConfig()
  // we assume url does not change
  const url = window.location.href
  const mountConfig = useCurrentMountConfig(url, configs)
  const isAvailable = mountConfig !== undefined

  useEffect(() => {
    if (isAvailable) {
    }
  }, [isAvailable])

  return {
    isAvailable,
    mountConfig,
  }
}
