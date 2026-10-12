import { getDisplayStrings, zManifest } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { bundledManifestRaw } from '@/background/services/providers/bundledCatalog'
import { Language, toManifestLocale } from '@/common/localization/language'
import {
  BUILTIN_MANIFEST_NAMES,
  builtinDisplayName,
  withLocalizedBuiltinNames,
} from './builtinNames'
import type { ProviderConfig } from './schema'

/**
 * builtinDisplayName: a built-in still carrying a name it was seeded with, in
 * any language or as the old English literal, shows the manifest name for the
 * current language. Renamed built-ins and custom instances keep their stored
 * name. The name table matches what the bundled manifests seed per language.
 */

function config(id: string, manifestId: string, name: string): ProviderConfig {
  return { id, manifestId, name, enabled: true, configValues: {} }
}

describe('builtinDisplayName', () => {
  it('shows a zh-seeded built-in in English for an English UI', () => {
    expect(
      builtinDisplayName(config('dandanplay', 'dandanplay', '弹弹play'), 'en')
    ).toBe('DanDanPlay')
    expect(
      builtinDisplayName(config('bilibili', 'bilibili', 'B站'), 'en')
    ).toBe('Bilibili')
    expect(
      builtinDisplayName(config('tencent', 'tencent', '腾讯视频'), 'en')
    ).toBe('Tencent Video')
  })

  it('shows an en-seeded or legacy-named built-in in Chinese for a zh UI', () => {
    expect(
      builtinDisplayName(config('tencent', 'tencent', 'Tencent Video'), 'zh')
    ).toBe('腾讯视频')
    expect(
      builtinDisplayName(config('tencent', 'tencent', 'Tencent'), 'zh')
    ).toBe('腾讯视频')
  })

  it('keeps a renamed built-in as the user named it', () => {
    expect(
      builtinDisplayName(config('bilibili', 'bilibili', 'My Bili'), 'en')
    ).toBe('My Bili')
  })

  it('keeps a custom instance named like the built-in', () => {
    expect(
      builtinDisplayName(config('home-nas', 'dandanplay', '弹弹play'), 'en')
    ).toBe('弹弹play')
  })
})

describe('BUILTIN_MANIFEST_NAMES', () => {
  it('matches the bundled manifest names in every app language', () => {
    for (const [id, names] of Object.entries(BUILTIN_MANIFEST_NAMES)) {
      const manifest = zManifest.parse(bundledManifestRaw(id))
      for (const language of [Language.en, Language.zh]) {
        expect({ id, language, name: names[language] }).toEqual({
          id,
          language,
          name: getDisplayStrings(manifest, toManifestLocale(language)).name,
        })
      }
    }
  })
})

describe('withLocalizedBuiltinNames', () => {
  it('returns the same array when no name changes', () => {
    const configs = [config('bilibili', 'bilibili', 'Bilibili')]

    expect(withLocalizedBuiltinNames(configs, 'en')).toBe(configs)
  })
})
