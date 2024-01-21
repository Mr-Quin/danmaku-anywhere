import { useMemo } from 'react'

import { useMountConfig } from './useMountConfig'

export const useMatchMountConfig = (url?: string) => {
  const { matchByUrl } = useMountConfig()

  return useMemo(() => {
    if (!url) return
    return matchByUrl(url)
  }, [url, matchByUrl])
}
