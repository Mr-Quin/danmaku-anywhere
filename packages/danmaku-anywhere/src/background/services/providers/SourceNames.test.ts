import { describe, expect, it } from 'vitest'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { makeProviderConfig } from '@/tests/factories'
import type { ManifestRegistry } from './ManifestRegistry'
import { SourceNames } from './SourceNames'

/**
 * SourceNames gives every coded source error the name the UI shows: the
 * custom name when there is one, otherwise the registry's name for the
 * manifest, and the server when two sources would otherwise share a name.
 */

const builtin = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
  customName: null,
})

function build(configs: ReturnType<typeof makeProviderConfig>[]) {
  const registry = {
    displayNames: async () => new Map([['dandanplay', '弹弹play']]),
  } satisfies Pick<ManifestRegistry, 'displayNames'>
  const providerConfigService = {
    getAll: async () => configs,
  } satisfies Pick<ProviderConfigService, 'getAll'>
  return new SourceNames(
    registry as unknown as ManifestRegistry, // lint-specs-allow-cast: SourceNames only calls displayNames
    providerConfigService as unknown as ProviderConfigService // lint-specs-allow-cast: SourceNames only calls getAll
  )
}

describe('SourceNames', () => {
  it('names a source without a custom name by its manifest', async () => {
    const ref = await build([builtin]).refOf(builtin)

    expect(ref).toEqual({
      providerConfigId: 'dandanplay',
      manifestId: 'dandanplay',
      name: '弹弹play',
    })
  })

  it('keeps a custom name', async () => {
    const mine = makeProviderConfig({ id: 'mine', customName: 'Home server' })

    expect((await build([builtin, mine]).refOf(mine)).name).toBe('Home server')
  })

  it('tells a self-hosted source on the default name apart by its server', async () => {
    const selfHosted = makeProviderConfig({
      id: 'self-hosted',
      manifestId: 'dandanplay',
      customName: null,
      configValues: { baseUrl: 'https://ddp.home.example' },
    })
    const refOf = await build([builtin, selfHosted]).refs()

    expect(refOf(builtin).name).toBe('弹弹play')
    expect(refOf(selfHosted).name).toBe('弹弹play (ddp.home.example)')
  })
})
