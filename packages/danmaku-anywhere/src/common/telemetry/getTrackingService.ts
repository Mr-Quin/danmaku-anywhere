import type { AgentOptions } from '@newrelic/browser-agent/loaders/agent'
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
  const nrOptions: AgentOptions = {
    loader_config: {
      accountID: '6949938',
      trustKey: '6949938',
      agentID: '1431857016',
      licenseKey: 'NRJS-b18292ee8bf6c4461c2',
      applicationID: '1431857016',
    },
    info: {
      beacon: 'bam.nr-data.net',
      errorBeacon: 'bam.nr-data.net',
      licenseKey: 'NRJS-b18292ee8bf6c4461c2',
      applicationID: '1431857016',
      sa: 1,
    },
    init: {
      session_trace: {
        enabled: true,
      },
      session_replay: {
        enabled: false,
        block_selector: '',
        mask_text_selector: isPopup ? '' : '*',
        sampling_rate: isPopup ? 100.0 : 0, // disable replay for non-popup
        error_sampling_rate: 100.0,
        mask_all_inputs: true,
        collect_fonts: true,
        inline_images: false,
        fix_stylesheets: true,
        preload: false,
        mask_input_options: {},
      },
      logging: {
        enabled: true,
      },
      distributed_tracing: { enabled: true },
      privacy: { cookies_enabled: true },
      ajax: { deny_list: ['bam.nr-data.net'] },
    },
  }

  const clarityOptions = {
    projectId: isPopup ? 'sh0awpf0za' : 'sh39frrlqn',
    upload: 'https://m.clarity.ms/collect',
    track: true,
    content: true,
  }

  const service = new CombinedTrackingService(nrOptions, clarityOptions)
  trackingService = service

  service.tag('environment', environment)
  service.tag('type', type)
  service.tag('version', EXTENSION_VERSION)

  return trackingService
}
