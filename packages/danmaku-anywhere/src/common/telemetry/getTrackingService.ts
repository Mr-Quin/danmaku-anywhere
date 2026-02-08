import { EXTENSION_VERSION } from '@/common/constants'
import type { EnvironmentType } from '@/common/environment/context'
import {
  CombinedTrackingService,
  NoopTrackingService,
  type TrackingService,
} from '@/common/telemetry/TrackingService'
import { IS_STANDALONE_RUNTIME } from '../environment/isStandalone'

let trackingService: TrackingService | null = null
export const getTrackingService = () => {
  if (trackingService === null || IS_STANDALONE_RUNTIME) {
    return new NoopTrackingService()
  }
  return trackingService
}

export const createTrackingService = (
  environment: string,
  type: EnvironmentType
) => {
  if (trackingService !== null || IS_STANDALONE_RUNTIME) {
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
