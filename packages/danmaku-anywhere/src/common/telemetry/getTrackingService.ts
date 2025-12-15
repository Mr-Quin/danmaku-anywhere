import { EXTENSION_VERSION } from '@/common/constants'
import type { EnvironmentType } from '@/common/environment/context'
import {
  CombinedTrackingService,
  NoopTrackingService,
  type TrackingService,
} from '@/common/telemetry/TrackingService'

let trackingService: TrackingService | null = null
export const getTrackingService = () => {
  if (trackingService === null) {
    return new NoopTrackingService()
  }
  return trackingService
}

export const createTrackingService = (
  environment: string,
  type: EnvironmentType
) => {
  if (trackingService !== null) {
    return trackingService
  }

  const isPopup = type === 'popup'

  const clarityOptions = {
    projectId: isPopup ? 'sh0awpf0za' : 'sh39frrlqn',
    upload: 'https://m.clarity.ms/collect',
    track: true,
    content: true,
  }

  const service = new CombinedTrackingService(clarityOptions)
  trackingService = service

  service.tag('environment', environment)
  service.tag('type', type)
  service.tag('version', EXTENSION_VERSION)

  return trackingService
}
