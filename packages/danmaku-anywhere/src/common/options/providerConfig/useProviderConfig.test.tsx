import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import type { ProviderConfig } from './schema'
import { useProviderConfig } from './useProviderConfig'

/**
 * useProviderConfig reads the provider store only once the options upgrade
 * has recorded the running version. A popup opened while lastVersion is still
 * behind shows the suspense fallback instead of the pre-upgrade store, and
 * renders the upgraded configs once the version is written.
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

afterEach(() => {
  root?.unmount()
  root = undefined
})

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
