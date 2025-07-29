import { Injectable } from '@angular/core'
import Clarity from '@microsoft/clarity'
import type { AgentOptions } from '@newrelic/browser-agent/loaders/agent'
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'
import { environment } from '../../environments/environment'

const options: AgentOptions = {
  loader_config: {
    accountID: '6949938',
    trustKey: '6949938',
    agentID: '1431855944',
    licenseKey: 'NRJS-b18292ee8bf6c4461c2',
    applicationID: '1431855944',
  },
  info: {
    beacon: 'bam.nr-data.net',
    errorBeacon: 'bam.nr-data.net',
    licenseKey: 'NRJS-b18292ee8bf6c4461c2',
    applicationID: '1431855944',
    sa: 1,
  },
  init: {
    session_replay: {
      enabled: true,
      block_selector: '',
      mask_text_selector: '',
      sampling_rate: 100.0,
      error_sampling_rate: 100.0,
      mask_all_inputs: false,
      collect_fonts: true,
      inline_images: false,
      fix_stylesheets: true,
      preload: false,
      mask_input_options: {},
      autoStart: false,
    },
    performance: {
      capture_marks: true,
      capture_detail: true,
      capture_measures: true,
      resources: {
        enabled: true,
      },
    },
    distributed_tracing: { enabled: true },
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ['bam.nr-data.net'] },
  },
}

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  private agent = new BrowserAgent(options)

  identify(userId: string) {
    this.agent.setUserId(userId)
    Clarity.identify(userId)
  }

  track(key: string, value: string) {
    this.agent.setCustomAttribute(key, value)
    Clarity.setTag(key, value)
  }

  cookieConsent(consent: boolean) {
    Clarity.consent(consent)
  }

  init() {
    this.agent.start()
    Clarity.init(environment.clarityId)
    this.track('env', environment.name)
  }
}
