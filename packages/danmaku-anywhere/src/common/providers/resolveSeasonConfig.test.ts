import { describe, expect, it } from 'vitest'
import { makeProviderConfig } from '@/tests/factories'
import { resolveSeasonConfig } from './resolveSeasonConfig'

/**
 * A season resolves to the config whose id it was fetched under. Another
 * config of the same manifest or for the same server does not adopt it, and a
 * season whose config is gone resolves to nothing (an orphan).
 */
describe('resolveSeasonConfig', () => {
  it('resolves a built-in season to the config with its id', () => {
    const bilibili = makeProviderConfig({
      id: 'bilibili',
      manifestId: 'bilibili',
    })
    expect(
      resolveSeasonConfig({ providerConfigId: 'bilibili' }, [bilibili])
    ).toBe(bilibili)
  })

  it('picks the config by id among configs for the same server', () => {
    const configA = makeProviderConfig({
      id: 'uuid-a',
      configValues: { baseUrl: 'https://server/api' },
    })
    const configB = makeProviderConfig({
      id: 'uuid-b',
      configValues: { baseUrl: 'https://server/api' },
    })
    expect(
      resolveSeasonConfig({ providerConfigId: 'uuid-b' }, [configA, configB])
    ).toBe(configB)
  })

  it('returns undefined for an orphan whose config was deleted', () => {
    const dandanplay = makeProviderConfig({ id: 'dandanplay' })
    expect(
      resolveSeasonConfig({ providerConfigId: 'uuid-gone' }, [dandanplay])
    ).toBeUndefined()
  })
})
