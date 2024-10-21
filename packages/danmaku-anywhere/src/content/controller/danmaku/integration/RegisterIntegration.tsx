import { memo } from 'react'

import { useIntegrationPolicy } from './hooks/useIntegrationPolicy'

/**
 * This component is responsible for finding the right observer for the current page,
 * and setting up the observer.
 */
export const RegisterIntegration = memo(() => {
  useIntegrationPolicy()

  return null
})

RegisterIntegration.displayName = 'RegisterIntegration'
