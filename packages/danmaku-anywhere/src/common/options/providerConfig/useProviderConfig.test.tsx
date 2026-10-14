import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense, use } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { followBackgroundChanges } from '@/common/queries/followBackgroundChanges'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { OPTION_STORES } from '../optionStores'
import type { ProviderConfig } from './schema'
import { useProviderConfig } from './useProviderConfig'
import { LATEST_PROVIDER_CONFIG_VERSION } from './version'

/**
 * Configs the background writes to the provider store during or after
 * useProviderConfig's first read, before the page has mounted, still reach
 * the page. Waiting for the options upgrade is covered by the
 * useOptionStoreQuery and OptionsReadinessGate tests.
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

async function seedUpgradedStores(providers: ProviderConfig[]) {
  for (const store of OPTION_STORES) {
    const data = store.key === 'providerConfig' ? providers : {}
    await fakeBrowser.storage[store.area].set({
      [store.key]: { data, version: store.latestVersion },
    })
  }
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

it('shows configs written after the first read but before the page mounts', async () => {
  await seedUpgradedStores([config('first read')])
  const client = new QueryClient()
  stopFollowing = followBackgroundChanges(client)
  const mount = Promise.withResolvers<void>()

  const element = renderConfigNames(client, mount.promise)
  await vi.waitFor(() => {
    expect(client.getQueryState(PROVIDER_CONFIG_KEY)?.status).toBe('success')
  })
  await fakeBrowser.storage.sync.set({
    providerConfig: {
      data: [config('written later')],
      version: LATEST_PROVIDER_CONFIG_VERSION,
    },
  })
  mount.resolve()

  await vi.waitFor(() => {
    expect(element.textContent).toBe('written later')
  })
})

it('shows configs written while the first read was resolving', async () => {
  await seedUpgradedStores([config('first read')])
  const get = fakeBrowser.storage.sync.get.bind(fakeBrowser.storage.sync)
  vi.spyOn(fakeBrowser.storage.sync, 'get').mockImplementationOnce(
    async (keys) => {
      const result = await get(keys)
      await fakeBrowser.storage.sync.set({
        providerConfig: {
          data: [config('written later')],
          version: LATEST_PROVIDER_CONFIG_VERSION,
        },
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
