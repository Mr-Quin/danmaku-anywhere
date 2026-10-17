import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from './schema'
import { findSourceName } from './utils'

/**
 * findSourceName names the source a failed request went to: the episode's own
 * config, or the first enabled automatic source when matching.
 */

function config(
  id: string,
  name: string,
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  return {
    id,
    manifestId: 'dandanplay',
    name,
    enabled: true,
    configValues: {},
    ...overrides,
  } as ProviderConfig
}

describe('findSourceName', () => {
  const configs = [
    config('maccms', 'MacCMS', { manifestId: LEGACY_MACCMS_ID }),
    config('off', 'Disabled', { enabled: false }),
    config('dandanplay', 'DanDanPlay'),
    config('bilibili', 'Bilibili'),
  ]

  it('names the config the episode came from', () => {
    expect(findSourceName(configs, 'bilibili')).toBe('Bilibili')
  })

  it('names the first enabled automatic source when no config is given', () => {
    expect(findSourceName(configs)).toBe('DanDanPlay')
  })

  it('returns undefined for an unknown config', () => {
    expect(findSourceName(configs, 'gone')).toBeUndefined()
  })
})
