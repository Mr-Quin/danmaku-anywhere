import { type Core, clarity } from 'clarity-js'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {
  Surface,
  TelemetryEventMap,
  TelemetryEventName,
} from '@/common/telemetry/events'

export abstract class TrackingService {
  abstract identify(userId: string): void
  abstract track<E extends TelemetryEventName>(
    name: E,
    properties: TelemetryEventMap[E]
  ): void
  abstract tag(key: string, value: string): void
  abstract init(): void
}

export class NoopTrackingService implements TrackingService {
  identify(userId: string): void {
    // noop
  }

  track<E extends TelemetryEventName>(
    name: E,
    properties: TelemetryEventMap[E]
  ): void {
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
  constructor(
    private surface: Surface,
    private clarityOptions?: Core.Config
  ) {}

  identify(userId: string) {
    if (this.clarityOptions) {
      clarity.identify(userId)
    }
  }

  track<E extends TelemetryEventName>(
    name: E,
    properties: TelemetryEventMap[E]
  ) {
    if (this.clarityOptions) {
      try {
        clarity.event(name, JSON.stringify(properties))
      } catch {
        // ignore
      }
    }

    void chromeRpcClient
      .telemetryEvent({
        event: name,
        properties,
        surface: this.surface,
        clientTs: Date.now(),
      })
      .catch(() => {
        // telemetry is fire-and-forget; a relay failure must never surface
      })
  }

  tag(key: string, value: string) {
    if (this.clarityOptions) {
      clarity.set(key, value)
    }
  }

  init() {
    if (this.clarityOptions) {
      clarity.start(this.clarityOptions)
    }
  }
}
