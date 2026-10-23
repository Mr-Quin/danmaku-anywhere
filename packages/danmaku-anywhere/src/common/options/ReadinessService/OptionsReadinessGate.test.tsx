import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { LATEST_PROVIDER_CONFIG_VERSION } from '@/common/options/providerConfig/version'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { UPGRADE_RUN_KEY } from '@/common/options/upgrade/upgradeRun'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { OptionsReadinessGate } from './OptionsReadinessGate'

/**
 * OptionsReadinessGate shows the upgrade's state in place of the UI. A popup
 * opened while the provider store is behind shows the pending element instead
 * of the pre-upgrade store, the failed element once the service worker
 * records a failed run, and the configs once a retry there succeeds.
 */

// A self-hosted DanDanPlay stored before version 6, which keeps its name as
// the custom name.
function storedConfig(name: string) {
  return {
    id: 'mine',
    manifestId: 'dandanplay',
    name,
    enabled: true,
    configValues: { baseUrl: 'https://ddp.mine.example' },
  }
}

function ConfigNames() {
  const { configs } = useProviderConfig()
  return <span>{configs.map((c) => c.customName).join(',')}</span>
}

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
})

it('shows pending, then the failure, then the upgraded configs after a retry', async () => {
  await fakeBrowser.storage.sync.set({
    providerConfig: { data: [storedConfig('stored config')], version: 4 },
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

  await fakeBrowser.storage.local.set({
    [UPGRADE_RUN_KEY]: {
      status: 'failed',
      build: EXTENSION_VERSION,
      attempts: 1,
      failedAt: 0,
      message: 'QUOTA_BYTES quota exceeded',
    },
  })
  await vi.waitFor(() => {
    expect(element.textContent).toBe('failed')
  })

  await createUpgradeContainer({ ready: false })
    .get(OptionsUpgradeService)
    .upgrade()

  await vi.waitFor(() => {
    expect(element.textContent).toBe('stored config')
  })
  const stored = await fakeBrowser.storage.sync.get('providerConfig')
  expect(stored.providerConfig).toMatchObject({
    version: LATEST_PROVIDER_CONFIG_VERSION,
  })
})
