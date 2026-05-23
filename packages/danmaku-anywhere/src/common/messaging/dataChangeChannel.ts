import type { QueryKey } from '@tanstack/react-query'

// Typed message bus between same-origin extension pages. Content scripts run
// at the host page's origin and are handled by invalidateContentScriptData
// in the background SW.

export type DataChangeEvent = {
  type: 'invalidateQueries'
  keys: QueryKey[]
}

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
