import type { QueryKey } from '@tanstack/react-query'

// Typed message bus between the background and same-origin extension pages.
// Content scripts run at the host page's origin and are handled by
// invalidateContentScriptData in the background SW.

export interface ManifestChange {
  // Manifests whose stored copy was added, replaced or removed.
  manifestIds: string[]
  // A catalog copy was stored or the catalog was checked, which moves the
  // pending updates and the last-checked time.
  catalogChanged: boolean
}

export type DataChangeEvent =
  | {
      type: 'invalidateQueries'
      keys: QueryKey[]
    }
  | ({ type: 'manifestsChanged' } & ManifestChange)

type Handler = (event: DataChangeEvent) => void

const CHANNEL_NAME = 'danmaku-anywhere:data-change'

const channel =
  typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel(CHANNEL_NAME)

const handlers = new Set<Handler>()

channel?.addEventListener('message', (event: MessageEvent<DataChangeEvent>) => {
  if (!event.data) {
    return
  }
  for (const handler of handlers) {
    handler(event.data)
  }
})

export function publishDataChange(event: DataChangeEvent): void {
  channel?.postMessage(event)
}

export function subscribeDataChange(handler: Handler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}
