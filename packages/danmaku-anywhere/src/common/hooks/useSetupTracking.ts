import type { AgentOptions } from '@newrelic/browser-agent/loaders/agent'
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'
import { useEffect, useRef } from 'react'
import { useEnvironmentContext } from '@/common/environment/context'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { invariant } from '@/common/utils/utils'

export class TrackingService {
  private readonly agent

  constructor(options: AgentOptions) {
    this.agent = new BrowserAgent(options)
  }

  identify(userId: string) {
    this.agent.setUserId(userId)
  }

  track(name: string, attributes?: object) {
    this.agent.recordCustomEvent(name, attributes)
  }

  tag(key: string, value: string) {
    this.agent.setCustomAttribute(key, value)
  }

  init() {
    this.agent.start()
  }
}

let trackingService: TrackingService | null = null

export const getTrackingService = () => {
  invariant(trackingService !== null, 'TrackingService is not initialized')
  return trackingService
}

export const useSetupTracking = () => {
  const agentRef = useRef<TrackingService>(null)
  const { data } = useExtensionOptions()
  const { environment, type } = useEnvironmentContext()

  useEffect(() => {
    const options: AgentOptions = {
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
          enabled: true,
          block_selector: '',
          mask_text_selector: type === 'popup' ? '' : '*',
          sampling_rate: 50.0,
          error_sampling_rate: 100.0,
          mask_all_inputs: true,
          collect_fonts: true,
          inline_images: false,
          fix_stylesheets: true,
          preload: false,
          mask_input_options: {},
        },
        distributed_tracing: { enabled: true },
        privacy: { cookies_enabled: true },
        ajax: { deny_list: ['bam.nr-data.net'] },
      },
    }

    const service = new TrackingService(options)
    service.init()
    service.tag('environment', environment)
    service.tag('type', type)

    trackingService = service
    agentRef.current = service
  }, [])

  useEffect(() => {
    if (data.id) {
      agentRef.current?.identify(data.id)
    }
  }, [data.id])

  return agentRef.current
}
