import { useMemo } from 'react'

import { useMountConfig } from './useMountConfig'

export const useMatchMountConfig = (url?: string) => {
  const { matchByUrl } = useMountConfig()

  return useMemo(() => {
    if (!url) return
    const match = matchByUrl(url)
    return match
  }, [url, matchByUrl])
}
