import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import type { ProviderConfig } from './providerConfig/schema'
import { useProviderConfig } from './providerConfig/useProviderConfig'
import { OptionsUpgradeService } from './upgrade/OptionsUpgradeService'

/**
 * An option hook suspends until every option store is upgraded, wherever it
 * renders, so a root without the readiness gate never reads a store in its
 * old shape.
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

it('suspends an option hook rendered outside the gate until the stores are upgraded', async () => {
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('stored config')], version: 4 },
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

  await createUpgradeContainer({ ready: false })
    .get(OptionsUpgradeService)
    .upgrade()

  await vi.waitFor(() => {
    expect(element.textContent).toBe('stored config')
  })
})
