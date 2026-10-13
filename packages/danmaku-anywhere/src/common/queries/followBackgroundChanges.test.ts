import { QueryClient } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { followBackgroundChanges } from './followBackgroundChanges'
import { seasonQueryKeys, sourceQueryKeys, storageQueryKeys } from './queryKeys'

/**
 * followBackgroundChanges turns changes made in other contexts into query
 * invalidations: a manifest change announced on the data-change channel marks
 * every source query stale, an invalidateQueries event marks the keys it names,
 * and a chrome.storage write marks the queries reading that key in that area.
 */

const sender = new BroadcastChannel('danmaku-anywhere:data-change')

let client: QueryClient
let stopFollowing: () => void

beforeEach(() => {
  client = new QueryClient()
  stopFollowing = followBackgroundChanges(client)
})

afterEach(() => {
  stopFollowing()
  client.clear()
})

function isInvalidated(queryKey: readonly unknown[]): boolean | undefined {
  return client.getQueryState(queryKey)?.isInvalidated
}

describe('followBackgroundChanges', () => {
  it('invalidates every source query when the manifests change', async () => {
    client.setQueryData(sourceQueryKeys.manifestList('en'), {})
    client.setQueryData(sourceQueryKeys.pendingUpdates(), [])
    client.setQueryData(sourceQueryKeys.manifestSpec('one', 'en'), {})
    client.setQueryData(seasonQueryKeys.all(), [])

    sender.postMessage({ type: 'manifestsChanged' })

    await vi.waitFor(() => {
      expect(isInvalidated(sourceQueryKeys.manifestList('en'))).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(true)
    expect(isInvalidated(sourceQueryKeys.manifestSpec('one', 'en'))).toBe(true)
    expect(isInvalidated(seasonQueryKeys.all())).toBe(false)
  })

  it('invalidates the keys named by an invalidateQueries event', async () => {
    client.setQueryData(seasonQueryKeys.all(), [])
    client.setQueryData(sourceQueryKeys.pendingUpdates(), [])

    sender.postMessage({
      type: 'invalidateQueries',
      keys: [seasonQueryKeys.all()],
    })

    await vi.waitFor(() => {
      expect(isInvalidated(seasonQueryKeys.all())).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(false)
  })

  it('invalidates the queries reading a key written to storage', async () => {
    const written = storageQueryKeys.external('sync', ['providerConfig'])
    const otherKey = storageQueryKeys.external('sync', ['mountConfig'])
    const otherArea = storageQueryKeys.external('local', ['providerConfig'])
    client.setQueryData(written, {})
    client.setQueryData(otherKey, {})
    client.setQueryData(otherArea, {})

    await fakeBrowser.storage.sync.set({ providerConfig: { data: [] } })

    await vi.waitFor(() => {
      expect(isInvalidated(written)).toBe(true)
    })
    expect(isInvalidated(otherKey)).toBe(false)
    expect(isInvalidated(otherArea)).toBe(false)
  })

  it('stops invalidating once unsubscribed', async () => {
    const queryKey = storageQueryKeys.external('sync', ['providerConfig'])
    client.setQueryData(queryKey, {})
    stopFollowing()

    await fakeBrowser.storage.sync.set({ providerConfig: { data: [] } })
    sender.postMessage({ type: 'manifestsChanged' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(isInvalidated(queryKey)).toBe(false)
  })
})
