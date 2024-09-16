import type { MediaInfo } from '@/content/danmaku/integration/models/MediaInfo'

interface IntegrationHandlers {
  titleChange: (title: string) => void
  seasonChange: (season: number) => void
  episodeChange: (episode: number) => void
  mediaChange: (state: MediaInfo) => void
  error: (err: Error) => void
}

type IntegrationEventKey = keyof IntegrationHandlers

type Fn = (...args: any[]) => void

export abstract class MediaObserver {
  private subscriptions: Map<IntegrationEventKey, Set<Fn>>

  protected constructor() {
    this.subscriptions = new Map()
  }

  abstract setup(): void

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
