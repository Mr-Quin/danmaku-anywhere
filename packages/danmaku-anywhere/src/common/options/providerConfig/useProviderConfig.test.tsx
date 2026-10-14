import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense, use } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import { followBackgroundChanges } from '@/common/queries/followBackgroundChanges'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import type { ProviderConfig } from './schema'
import { useProviderConfig } from './useProviderConfig'

/**
 * useProviderConfig reads the provider store only once the options upgrade
 * has recorded the running version. A popup opened while lastVersion is still
 * behind shows the suspense fallback instead of the pre-upgrade store, and
 * renders the upgraded configs once the version is written. Configs the
 * background writes during or after that first read, before the page has
 * mounted, still reach the page.
 */

function config(name: string): ProviderConfig {
  return {
    id: 'dandanplay',
    manifestId: 'dandanplay',
    name,
    enabled: true,
    configValues: {},
  }
}

function ConfigNames() {
  const { configs } = useProviderConfig()
  return <span>{configs.map((c) => c.name).join(',')}</span>
}

let root: Root | undefined
let stopFollowing: (() => void) | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
  stopFollowing?.()
  stopFollowing = undefined
})

const PROVIDER_CONFIG_KEY = storageQueryKeys.external('sync', [
  'providerConfig',
])

// Holds the Suspense boundary, and so the commit, until mounted resolves.
function MountGate({ mounted }: { mounted: Promise<void> }) {
  use(mounted)
  return null
}

function renderConfigNames(
  client: QueryClient,
  mounted: Promise<void>
): HTMLElement {
  const element = document.createElement('div')
  root = createRoot(element)
  root.render(
    <QueryClientProvider client={client}>
      <Suspense fallback="loading">
        <ConfigNames />
        <MountGate mounted={mounted} />
      </Suspense>
    </QueryClientProvider>
  )
  return element
}

it('suspends until the upgrade records the running version', async () => {
  await fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: '0.0.1' },
  })
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('before upgrade')], version: 4 },
  })
  const element = document.createElement('div')
  root = createRoot(element)

  root.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">
        <ConfigNames />
      </Suspense>
    </QueryClientProvider>
  )
  await vi.waitFor(() => {
    expect(element.textContent).toBe('loading')
  })
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(element.textContent).toBe('loading')

  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('after upgrade')], version: 5 },
  })
  await fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: EXTENSION_VERSION },
  })

  await vi.waitFor(() => {
    expect(element.textContent).toBe('after upgrade')
  })
})

it('shows configs written after the first read but before the page mounts', async () => {
  await fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: EXTENSION_VERSION },
  })
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('first read')], version: 5 },
  })
  const client = new QueryClient()
  stopFollowing = followBackgroundChanges(client)
  const mount = Promise.withResolvers<void>()

  const element = renderConfigNames(client, mount.promise)
  await vi.waitFor(() => {
    expect(client.getQueryState(PROVIDER_CONFIG_KEY)?.status).toBe('success')
  })
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('written later')], version: 5 },
  })
  mount.resolve()

  await vi.waitFor(() => {
    expect(element.textContent).toBe('written later')
  })
})

it('shows configs written while the first read was resolving', async () => {
  await fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: EXTENSION_VERSION },
  })
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('first read')], version: 5 },
  })
  const get = fakeBrowser.storage.sync.get.bind(fakeBrowser.storage.sync)
  vi.spyOn(fakeBrowser.storage.sync, 'get').mockImplementationOnce(
    async (keys) => {
      const result = await get(keys)
      await fakeBrowser.storage.sync.set({
        providerConfig: { data: [config('written later')], version: 5 },
      })
      return result
    }
  )
  const client = new QueryClient()
  stopFollowing = followBackgroundChanges(client)

  const element = renderConfigNames(client, Promise.resolve())

  await vi.waitFor(() => {
    expect(element.textContent).toBe('written later')
  })
})
