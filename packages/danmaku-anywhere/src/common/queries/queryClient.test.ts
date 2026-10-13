import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from './queryClient'
import { seasonQueryKeys, sourceQueryKeys } from './queryKeys'

/**
 * Background announcements on the data-change channel reach every extension
 * page's query client. A manifest change marks every source query stale and
 * leaves unrelated queries alone.
 */

const sender = new BroadcastChannel('danmaku-anywhere:data-change')

afterEach(() => {
  queryClient.clear()
})

function isInvalidated(queryKey: readonly unknown[]): boolean | undefined {
  return queryClient.getQueryState(queryKey)?.isInvalidated
}

describe('queryClient', () => {
  it('invalidates every source query when the manifests change', async () => {
    queryClient.setQueryData(sourceQueryKeys.manifestList('en'), {})
    queryClient.setQueryData(sourceQueryKeys.pendingUpdates(), [])
    queryClient.setQueryData(sourceQueryKeys.manifestSpec('one', 'en'), {})
    queryClient.setQueryData(seasonQueryKeys.all(), [])

    sender.postMessage({ type: 'manifestsChanged' })

    await vi.waitFor(() => {
      expect(isInvalidated(sourceQueryKeys.manifestList('en'))).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(true)
    expect(isInvalidated(sourceQueryKeys.manifestSpec('one', 'en'))).toBe(true)
    expect(isInvalidated(seasonQueryKeys.all())).toBe(false)
  })

  it('invalidates the keys named by an invalidateQueries event', async () => {
    queryClient.setQueryData(seasonQueryKeys.all(), [])
    queryClient.setQueryData(sourceQueryKeys.pendingUpdates(), [])

    sender.postMessage({
      type: 'invalidateQueries',
      keys: [seasonQueryKeys.all()],
    })

    await vi.waitFor(() => {
      expect(isInvalidated(seasonQueryKeys.all())).toBe(true)
    })
    expect(isInvalidated(sourceQueryKeys.pendingUpdates())).toBe(false)
  })
})
