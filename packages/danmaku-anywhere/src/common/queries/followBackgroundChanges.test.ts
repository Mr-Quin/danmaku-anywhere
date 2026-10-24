import { QueryClient } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { followBackgroundChanges } from './followBackgroundChanges'
import { seasonQueryKeys, sourceQueryKeys, storageQueryKeys } from './queryKeys'

/**
 * followBackgroundChanges turns changes made in other contexts into query
 * invalidations: a manifest announcement marks the lists, plus pending updates
 * for a catalog change or the per-source queries of the manifests it names,
 * an invalidateQueries event marks the keys it names, and a chrome.storage
 * write marks the queries reading that key in that area, or the store whose
 * chunk items ("<key>.<field>.<n>") it wrote. Source capability answers
 * follow a changed manifest and a write to the stored configs or manifests. A
 * change that lands during a query's first fetch still leaves the query stale
 * once it settles.
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
  it('refreshes the lists and pending updates on a catalog check, and nothing per source', async () => {
    client.setQueryData(sourceQueryKeys.manifestList('en'), {})
    client.setQueryData(sourceQueryKeys.manifestList('zh-CN'), {})
    client.setQueryData(sourceQueryKeys.pendingUpdates(), [])
    client.setQueryData(sourceQueryKeys.loginStatus('bilibili'), {})
    client.setQueryData(sourceQueryKeys.manifestSpec('bilibili', 'en'), {})
    client.setQueryData(sourceQueryKeys.manifestSource('bilibili'), {})
    client.setQueryData(sourceQueryKeys.configCapabilities('bilibili'), {})

    sender.postMessage({
      type: 'manifestsChanged',
      manifestIds: [],
      catalogChanged: true,
    })

    await vi.waitFor(() => {
      expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.manifestList('en'))).toBe(true)
    expect(isInvalidated(sourceQueryKeys.manifestList('zh-CN'))).toBe(true)
    expect(isInvalidated(sourceQueryKeys.loginStatus('bilibili'))).toBe(false)
    expect(isInvalidated(sourceQueryKeys.manifestSpec('bilibili', 'en'))).toBe(
      false
    )
    expect(isInvalidated(sourceQueryKeys.manifestSource('bilibili'))).toBe(
      false
    )
    expect(isInvalidated(sourceQueryKeys.configCapabilities('bilibili'))).toBe(
      false
    )
  })

  it('refreshes the list and the queries of the changed manifests only', async () => {
    client.setQueryData(sourceQueryKeys.manifestList('en'), {})
    client.setQueryData(sourceQueryKeys.pendingUpdates(), [])
    client.setQueryData(sourceQueryKeys.loginStatus('mine:one'), {})
    client.setQueryData(sourceQueryKeys.manifestSpec('mine:one', 'en'), {})
    client.setQueryData(sourceQueryKeys.manifestSource('mine:one'), {})
    client.setQueryData(sourceQueryKeys.loginStatus('bilibili'), {})
    client.setQueryData(seasonQueryKeys.all(), [])
    client.setQueryData(sourceQueryKeys.configCapabilities('mine-config'), {})
    client.setQueryData(sourceQueryKeys.urlSource('https://a.example/1'), {})

    sender.postMessage({
      type: 'manifestsChanged',
      manifestIds: ['mine:one'],
      catalogChanged: false,
    })

    await vi.waitFor(() => {
      expect(isInvalidated(sourceQueryKeys.manifestList('en'))).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.loginStatus('mine:one'))).toBe(true)
    expect(isInvalidated(sourceQueryKeys.manifestSpec('mine:one', 'en'))).toBe(
      true
    )
    expect(isInvalidated(sourceQueryKeys.manifestSource('mine:one'))).toBe(true)
    expect(isInvalidated(sourceQueryKeys.loginStatus('bilibili'))).toBe(false)
    expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(false)
    expect(isInvalidated(seasonQueryKeys.all())).toBe(false)
    expect(
      isInvalidated(sourceQueryKeys.configCapabilities('mine-config'))
    ).toBe(true)
    expect(
      isInvalidated(sourceQueryKeys.urlSource('https://a.example/1'))
    ).toBe(true)
  })

  it.each([
    ['sync', 'providerConfig'],
    ['local', 'manifests'],
  ] as const)('refreshes source capabilities on a %s write to %s', async (area, key) => {
    const capabilities = sourceQueryKeys.configCapabilities('bilibili')
    const urlSource = sourceQueryKeys.urlSource('https://a.example/1')
    client.setQueryData(capabilities, {})
    client.setQueryData(urlSource, {})

    await fakeBrowser.storage[area].set({ [key]: {} })

    await vi.waitFor(() => {
      expect(isInvalidated(capabilities)).toBe(true)
    })
    expect(isInvalidated(urlSource)).toBe(true)
  })

  it('keeps source capabilities on an unrelated storage write', async () => {
    const capabilities = sourceQueryKeys.configCapabilities('bilibili')
    const unrelated = storageQueryKeys.external('sync', ['mountConfig'])
    client.setQueryData(capabilities, {})
    client.setQueryData(unrelated, {})

    await fakeBrowser.storage.sync.set({ mountConfig: {} })

    await vi.waitFor(() => {
      expect(isInvalidated(unrelated)).toBe(true)
    })
    expect(isInvalidated(capabilities)).toBe(false)
  })

  it('leaves a query stale when storage changes during its first fetch', async () => {
    const queryKey = storageQueryKeys.external('sync', ['providerConfig'])
    const read = Promise.withResolvers<string>()
    const firstFetch = client.prefetchQuery({
      queryKey,
      queryFn: () => read.promise,
    })

    await fakeBrowser.storage.sync.set({ providerConfig: { data: [] } })
    read.resolve('read before the write')
    await firstFetch

    await vi.waitFor(() => {
      expect(isInvalidated(queryKey)).toBe(true)
    })
  })

  it('leaves a query stale when its manifest changes during its first fetch', async () => {
    const queryKey = sourceQueryKeys.manifestSource('mine:one')
    const read = Promise.withResolvers<string>()
    const firstFetch = client.prefetchQuery({
      queryKey,
      queryFn: () => read.promise,
    })

    sender.postMessage({
      type: 'manifestsChanged',
      manifestIds: ['mine:one'],
      catalogChanged: false,
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    read.resolve('read before the save')
    await firstFetch

    await vi.waitFor(() => {
      expect(isInvalidated(queryKey)).toBe(true)
    })
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

  it('invalidates the queries reading a store when only its chunk items change', async () => {
    const store = storageQueryKeys.external('sync', ['danmakuOptions'])
    const lookalike = storageQueryKeys.external('sync', ['danmakuOptionsX'])
    client.setQueryData(store, {})
    client.setQueryData(lookalike, {})

    await fakeBrowser.storage.sync.set({ 'danmakuOptions.filters.1': '[]' })

    await vi.waitFor(() => {
      expect(isInvalidated(store)).toBe(true)
    })
    expect(isInvalidated(lookalike)).toBe(false)
  })

  it('stops invalidating once unsubscribed', async () => {
    const queryKey = storageQueryKeys.external('sync', ['providerConfig'])
    client.setQueryData(queryKey, {})
    stopFollowing()

    await fakeBrowser.storage.sync.set({ providerConfig: { data: [] } })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(isInvalidated(queryKey)).toBe(false)
  })
})
