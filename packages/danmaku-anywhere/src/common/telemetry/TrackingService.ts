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
  constructor(private clarityOptions: Core.Config) {}

  identify(userId: string) {
    clarity.identify(userId)
  }

  track(name: string, attributes?: object) {
    try {
      clarity.event(name, JSON.stringify(attributes))
    } catch {
      // ignore
    }
  }

  tag(key: string, value: string) {
    clarity.set(key, value)
  }

  init() {
    clarity.start(this.clarityOptions)
  }
}
