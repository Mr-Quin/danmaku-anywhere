import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { queryClient } from '@/common/queries/queryClient'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { enforceSyncQuota } from '@/tests/syncQuota'
import type { DanmakuOptions } from './danmakuOptions/constant'
import { DanmakuOptionsService } from './danmakuOptions/service'
import { useDanmakuOptions } from './danmakuOptions/useDanmakuOptions'
import type { ProviderConfig } from './providerConfig/schema'
import { useProviderConfig } from './providerConfig/useProviderConfig'
import { OptionsUpgradeService } from './upgrade/OptionsUpgradeService'

/**
 * An option hook suspends until every option store is upgraded, wherever it
 * renders, so a root without the readiness gate never reads a store in its
 * old shape. The danmaku options hook reads and writes the logical store
 * whatever items it is split over, and a write the sync quota refuses is
 * reported in an error toast.
 */

function config(customName: string): ProviderConfig {
  return {
    id: 'dandanplay',
    manifestId: 'dandanplay',
    customName,
    enabled: true,
    configValues: {},
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
  queryClient.clear()
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

let saveDanmakuOptions: ((options: DanmakuOptions) => Promise<void>) | undefined

function FilterCount() {
  const { data, partialUpdate } = useDanmakuOptions()
  saveDanmakuOptions = partialUpdate
  return <span>{data.filters.length}</span>
}

// The app's client, which applies a mutation's invalidations and follows
// storage changes.
function renderFilterCount() {
  const element = document.createElement('div')
  root = createRoot(element)
  root.render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <FilterCount />
      </Suspense>
    </QueryClientProvider>
  )
  return element
}

function filters(count: number): DanmakuOptions['filters'] {
  return Array.from({ length: count }, (_, index) => {
    return { type: 'text', value: `blocked phrase ${index}`, enabled: true }
  })
}

it('saves a block list larger than one sync item through the danmaku options hook', async () => {
  enforceSyncQuota()
  await createUpgradeContainer({ ready: false })
    .get(OptionsUpgradeService)
    .upgrade()
  const element = renderFilterCount()
  await vi.waitFor(() => {
    expect(element.textContent).toBe('0')
  })

  const current = await createUpgradeContainer()
    .get(DanmakuOptionsService)
    .get()
  await saveDanmakuOptions?.({ ...current, filters: filters(800) })

  await vi.waitFor(() => {
    expect(element.textContent).toBe('800')
  })
})

it('shows an error toast when the sync quota refuses a danmaku options write', async () => {
  enforceSyncQuota()
  await createUpgradeContainer({ ready: false })
    .get(OptionsUpgradeService)
    .upgrade()
  const element = renderFilterCount()
  await vi.waitFor(() => {
    expect(element.textContent).toBe('0')
  })
  const current = await createUpgradeContainer()
    .get(DanmakuOptionsService)
    .get()

  await expect(
    saveDanmakuOptions?.({ ...current, filters: filters(5000) })
  ).rejects.toThrow()

  expect(useToast.getState().notifications.at(-1)).toMatchObject({
    severity: 'error',
    message: 'optionsStorage.saveFailed',
  })
  expect(element.textContent).toBe('0')
})
