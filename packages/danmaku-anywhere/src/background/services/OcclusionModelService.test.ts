import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import { BASELINE_MANIFEST } from '@/common/models/baseline'
import { ModelManifestService } from '@/common/models/ModelManifestService'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { OcclusionModelService } from './OcclusionModelService'

vi.mock('@/common/storage/opfsFileCache', () => ({
  fetchAndCacheFile: vi.fn(),
  listCachedFiles: vi.fn(async () => []),
  removeCachedFile: vi.fn(),
}))

/**
 * The background model service only lists, resolves and downloads models the
 * extension offers. Without the debug option that is the bundled People model:
 * a saved hosted model id, as a restored backup may carry, resolves to People
 * and cannot be downloaded. With the debug option hosted models are offered.
 */

function makeService(debug: boolean) {
  return createTestContainer(
    [backgroundContainerModule],
    [
      {
        identifier: ModelManifestService,
        value: { listModels: async () => BASELINE_MANIFEST.models },
      },
      {
        identifier: ExtensionOptionsService,
        value: { get: async () => ({ debug }) },
      },
      { identifier: LoggerSymbol, value: silentLogger },
    ]
  ).get(OcclusionModelService)
}

describe('OcclusionModelService', () => {
  it('lists only the People model without the debug option', async () => {
    const state = await makeService(false).getState()

    expect(state.models.map((model) => model.id)).toEqual(['people'])
  })

  it('resolves a saved hosted model to People without the debug option', async () => {
    const model = await makeService(false).resolveModel('anime')

    expect(model.id).toBe('people')
  })

  it('refuses to download a hosted model without the debug option', async () => {
    await expect(makeService(false).download('anime')).rejects.toThrow(
      /not a downloadable hosted model/
    )
  })

  it('offers and resolves hosted models with the debug option', async () => {
    const service = makeService(true)

    expect((await service.getState()).models.map((model) => model.id)).toEqual([
      'people',
      'anime',
    ])
    expect((await service.resolveModel('anime')).id).toBe('anime')
  })
})
