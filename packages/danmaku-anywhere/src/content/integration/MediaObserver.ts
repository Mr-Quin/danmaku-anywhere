export type PlaybackStatus = 'playing' | 'paused' | 'stopped'

export class MediaState {
  constructor(
    public title: string,
    public episode: number,
    public season?: number
  ) {}

  toString() {
    if (!this.season) return `${this.title} E${this.episode}`
    return `${this.title} S${this.season}E${this.episode}`
  }
}

interface IntegrationHandlers {
  titleChange: (title: string) => void
  seasonChange: (season: number) => void
  episodeChange: (episode: number) => void
  mediaChange: (state: MediaState) => void
  statusChange: (status: PlaybackStatus) => void
  error: (err: Error) => void
}

type IntegrationEventKey = keyof IntegrationHandlers

type Fn = (...args: any[]) => void

export class MediaObserver {
  private subscriptions: Map<IntegrationEventKey, Set<Fn>>
  static name = '__media_observer'

  constructor() {
    this.subscriptions = new Map()
  }

  setup() {
    return
  }

  on(handlers: Partial<IntegrationHandlers>) {
    Object.entries(handlers).forEach(([event, eventHandler]) => {
      if (!this.subscriptions.has(event as IntegrationEventKey)) {
        this.subscriptions.set(event as IntegrationEventKey, new Set())
      }
      this.subscriptions.get(event as IntegrationEventKey)!.add(eventHandler)
    })
  }

  off(event: IntegrationEventKey, listener: Fn) {
    if (!this.subscriptions.has(event)) return
    this.subscriptions.get(event)!.delete(listener)
  }

  emit<T extends IntegrationEventKey>(
    event: T,
    ...data: Parameters<IntegrationHandlers[T]>
  ) {
    const handlers = this.subscriptions.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(...data)
      })
    }
  }

  destroy() {
    this.subscriptions.clear()
  }
}
