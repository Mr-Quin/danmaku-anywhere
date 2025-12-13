import type { AgentOptions } from '@newrelic/browser-agent/loaders/agent'
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'
import { type Core, clarity } from 'clarity-js'

export abstract class TrackingService {
  abstract identify(userId: string): void
  abstract track(name: string, attributes?: object): void
  abstract tag(key: string, value: string): void
  abstract init(): void
}

export class NoopTrackingService implements TrackingService {
  identify(userId: string): void {
    // noop
  }

  track(name: string, attributes?: object): void {
    // noop
  }

  tag(key: string, value: string): void {
    // noop
  }

  init(): void {
    // noop
  }
}

export class CombinedTrackingService implements TrackingService {
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
    try {
      this.agent.recordCustomEvent(name, attributes)
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
