import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { useSaveUserManifest } from './useManifestEditor'

/**
 * A successful save writes the saved JSON into the cached manifest source, so
 * an editor reopened before the background's change announcement arrives
 * starts from what was saved rather than the pre-save copy.
 */

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    providerSaveUserManifest: vi.fn(async () => ({ data: undefined })),
  },
}))

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
})

async function renderSaver(
  client: QueryClient
): Promise<ReturnType<typeof useSaveUserManifest>> {
  let save: ReturnType<typeof useSaveUserManifest> | undefined
  function Saver() {
    save = useSaveUserManifest()
    return null
  }
  root = createRoot(document.createElement('div'))
  root.render(
    <QueryClientProvider client={client}>
      <Saver />
    </QueryClientProvider>
  )
  await vi.waitFor(() => {
    expect(save).toBeDefined()
  })
  return save as ReturnType<typeof useSaveUserManifest>
}

it('replaces the cached source with the saved manifest', async () => {
  const client = new QueryClient()
  const queryKey = sourceQueryKeys.manifestSource('mine:one')
  client.setQueryData(queryKey, {
    data: { manifest: { id: 'mine:one', version: '1.0.0' }, kind: 'user' },
  })
  const save = await renderSaver(client)

  await save.mutateAsync({
    manifest: { id: 'mine:one', version: '2.0.0' },
    mode: 'update',
    expectedId: 'mine:one',
  })

  expect(client.getQueryData(queryKey)).toEqual({
    data: { manifest: { id: 'mine:one', version: '2.0.0' }, kind: 'user' },
  })
})
