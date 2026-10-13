import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { uiContainer } from '@/common/ioc/uiIoc'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { OptionsReadinessGate } from './OptionsReadinessGate'
import { ReadinessService } from './ReadinessService'

/**
 * OptionsReadinessGate keeps option hooks from rendering until every store is
 * upgraded. A popup opened while the provider store is behind shows the
 * pending element instead of the pre-upgrade store, the failed element once an
 * upgrade attempt records a failure, and the configs once a retry succeeds.
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

it('shows pending, then the failure, then the upgraded configs after a retry', async () => {
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [config('stored config')], version: 4 },
  })
  const element = document.createElement('div')
  root = createRoot(element)

  root.render(
    <QueryClientProvider client={new QueryClient()}>
      <OptionsReadinessGate pending="pending" failed="failed">
        <Suspense fallback="loading">
          <ConfigNames />
        </Suspense>
      </OptionsReadinessGate>
    </QueryClientProvider>
  )
  await vi.waitFor(() => {
    expect(element.textContent).toBe('pending')
  })
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(element.textContent).toBe('pending')

  await uiContainer
    .get(ReadinessService)
    .recordFailure(new Error('QUOTA_BYTES quota exceeded'))
  await vi.waitFor(() => {
    expect(element.textContent).toBe('failed')
  })

  await uiContainer.get(OptionsUpgradeService).upgrade()

  await vi.waitFor(() => {
    expect(element.textContent).toBe('stored config')
  })
  const stored = await fakeBrowser.storage.sync.get('providerConfig')
  expect(stored.providerConfig).toMatchObject({ version: 5 })
})
