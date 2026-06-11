import { useEffect, useRef } from 'react'
import { useEnvironmentContext } from '@/common/environment/context'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import {
  createTrackingService,
  getTrackingService,
} from '@/common/telemetry/getTrackingService'
import type { TrackingService } from './TrackingService'

export const useSetupTracking = () => {
  const { data } = useExtensionOptions()
  const { environment, type } = useEnvironmentContext()
  const surface = type === 'popup' ? 'popup' : 'content'
  const trackingServiceRef = useRef<TrackingService>(
    createTrackingService(environment, surface)
  )

  useEffect(() => {
    if (data.enableAnalytics) {
      getTrackingService().init()
    }
  }, [data.enableAnalytics])

  useEffect(() => {
    if (data.id) {
      getTrackingService().identify(data.id)
    }
  }, [data.id])

  return trackingServiceRef.current
}
