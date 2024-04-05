import { memo } from 'react'

import { useMediaObserver } from './useMediaObserver'

export const MediaObserver = memo(() => {
  useMediaObserver()

  return null
})

MediaObserver.displayName = 'MediaObserver'
