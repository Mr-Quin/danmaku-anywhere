import { describe, expect, it } from 'vitest'
import { localizeLegacyBuiltinNames } from './localizeLegacyNames'
import type { ProviderConfig } from './schema'

/**
 * localizeLegacyBuiltinNames: built-ins still named with the pre-manifest
 * English defaults take their manifest display names, while renamed built-ins
 * and non-built-in instances of the same manifest keep the name they have.
 */

const ZH_NAMES = new Map([
  ['dandanplay', '弹弹play'],
  ['bilibili', 'B站'],
  ['tencent', '腾讯视频'],
])

function config(id: string, manifestId: string, name: string): ProviderConfig {
  return { id, manifestId, name, enabled: true, configValues: {} }
}

describe('localizeLegacyBuiltinNames', () => {
  it('renames each legacy built-in default to its manifest name', () => {
    const result = localizeLegacyBuiltinNames(
      [
        config('dandanplay', 'dandanplay', 'DanDanPlay'),
        config('bilibili', 'bilibili', 'Bilibili'),
        config('tencent', 'tencent', 'Tencent'),
      ],
      ZH_NAMES
    )

    expect(result.map((c) => c.name)).toEqual(['弹弹play', 'B站', '腾讯视频'])
  })

  it('keeps a built-in the user renamed', () => {
    const configs = [config('bilibili', 'bilibili', 'My Bili')]

    expect(localizeLegacyBuiltinNames(configs, ZH_NAMES)).toBe(configs)
  })

  it('keeps a self-hosted instance that shares the legacy name', () => {
    const configs = [config('d9d068cc', 'dandanplay', 'DanDanPlay')]

    expect(localizeLegacyBuiltinNames(configs, ZH_NAMES)).toBe(configs)
  })

  it('leaves a built-in alone when its manifest name is unknown', () => {
    const configs = [config('tencent', 'tencent', 'Tencent')]

    expect(localizeLegacyBuiltinNames(configs, new Map())).toBe(configs)
  })

  it('returns the input unchanged when the manifest name equals the legacy one', () => {
    const configs = [config('bilibili', 'bilibili', 'Bilibili')]

    expect(
      localizeLegacyBuiltinNames(configs, new Map([['bilibili', 'Bilibili']]))
    ).toBe(configs)
  })
})
