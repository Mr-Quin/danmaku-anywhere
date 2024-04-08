import { memo } from 'react'

import { useMediaObserver } from './useMediaObserver'

/**
 * This component is responsible for finding the right observer for the current page,
 * and setting up the observer.
 */
export const MediaObserver = memo(() => {
  useMediaObserver()

  return null
})

MediaObserver.displayName = 'MediaObserver'
