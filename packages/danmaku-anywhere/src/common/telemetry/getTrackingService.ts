import { EXTENSION_VERSION, IS_DA_E2E } from '@/common/constants'
import type { Surface } from '@/common/telemetry/events'
import {
  CombinedTrackingService,
  NoopTrackingService,
  type TrackingService,
} from '@/common/telemetry/TrackingService'
import { IS_STANDALONE_RUNTIME } from '../environment/isStandalone'

const CLARITY_PROJECT_IDS: Partial<Record<Surface, string>> = {
  popup: 'sh0awpf0za',
  content: 'sh39frrlqn',
}

let trackingService: TrackingService | null = null
export const getTrackingService = () => {
  if (trackingService === null || IS_STANDALONE_RUNTIME) {
    return new NoopTrackingService()
  }
  return trackingService
}

export const createTrackingService = (
  environment: string,
  surface: Surface
) => {
  // No real telemetry under e2e (or standalone): specs must not emit Clarity or
  // background-sink traffic.
  if (trackingService !== null || IS_STANDALONE_RUNTIME || IS_DA_E2E) {
    return trackingService ?? new NoopTrackingService()
  }

  const clarityProjectId = CLARITY_PROJECT_IDS[surface]

  const clarityOptions = clarityProjectId
    ? {
        projectId: clarityProjectId,
        upload: 'https://m.clarity.ms/collect',
        track: true,
        content: true,
      }
    : undefined

  const service = new CombinedTrackingService(surface, clarityOptions)
  trackingService = service

  if (clarityOptions) {
    service.tag('environment', environment)
    service.tag('type', surface)
    service.tag('version', EXTENSION_VERSION)
  }

  return trackingService
}
