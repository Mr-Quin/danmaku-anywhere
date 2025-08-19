import type { AgentOptions } from '@newrelic/browser-agent/loaders/agent'
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'
import { type Core, clarity } from 'clarity-js'
import { useEffect, useRef } from 'react'
import { EXTENSION_VERSION } from '@/common/constants'
import { useEnvironmentContext } from '@/common/environment/context'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { invariant } from '@/common/utils/utils'

export class TrackingService {
  private readonly agent

  constructor(
    nrOptions: AgentOptions,
    private clarityOptions: Core.Config
  ) {
    this.agent = new BrowserAgent(nrOptions)
  }

  identify(userId: string) {
    this.agent.setUserId(userId)
    clarity.identify(userId)
  }

  track(name: string, attributes?: object) {
    this.agent.recordCustomEvent(name, attributes)
    try {
      clarity.event(name, JSON.stringify(attributes))
    } catch {
      // ignore
    }
  }

  tag(key: string, value: string) {
    this.agent.setCustomAttribute(key, value)
    clarity.set(key, value)
  }

  init() {
    this.agent.start()
    clarity.start(this.clarityOptions)
  }
}

let trackingService: TrackingService | null = null

export const getTrackingService = () => {
  invariant(trackingService !== null, 'TrackingService is not initialized')
  return trackingService
}

const createTrackingService = (environment: string, type: string) => {
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
      session_replay: {
        enabled: isPopup, // disabled in content script
        block_selector: '',
        mask_text_selector: isPopup ? '' : '*',
        sampling_rate: 100.0,
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
    projectId: isPopup
      ? import.meta.env.VITE_CLARITY_PROJECT_ID_POPUP
      : import.meta.env.VITE_CLARITY_PROJECT_ID_CONTENT,
    upload: 'https://m.clarity.ms/collect',
    track: true,
    content: true,
  }

  const service = new TrackingService(nrOptions, clarityOptions)
  trackingService = service

  service.tag('environment', environment)
  service.tag('type', type)
  service.tag('version', EXTENSION_VERSION)

  return trackingService
}

export const useSetupTracking = () => {
  const { data } = useExtensionOptions()
  const { environment, type } = useEnvironmentContext()
  const trackingServiceRef = useRef<TrackingService>(
    createTrackingService(environment, type)
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
