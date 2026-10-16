import { Language } from '@/common/localization/language'
import { isBuiltinConfig } from './displayName'
import { LEGACY_BUILTIN_NAMES } from './migration'
import type { ProviderConfig } from './schema'

// The manifest name of each built-in in every app language, as a fresh
// install seeds it. Kept here rather than read from the bundled manifests so the
// popup and content script do not load whole manifests to render a name; a
// test holds it equal to the bundled manifests.
export const BUILTIN_MANIFEST_NAMES: Record<
  string,
  Record<Language, string>
> = {
  dandanplay: { [Language.en]: 'DanDanPlay', [Language.zh]: '弹弹play' },
  bilibili: { [Language.en]: 'Bilibili', [Language.zh]: 'B站' },
  tencent: { [Language.en]: 'Tencent Video', [Language.zh]: '腾讯视频' },
}

function isLanguage(value: string): value is Language {
  return value === Language.en || value === Language.zh
}

// Every name a built-in could have been given without the user typing one: the
// English literal of old releases and the manifest name in each language.
function isSeededName(manifestId: string, name: string): boolean {
  if (LEGACY_BUILTIN_NAMES[manifestId] === name) {
    return true
  }
  const names = BUILTIN_MANIFEST_NAMES[manifestId]
  if (!names) {
    return false
  }
  return Object.values(names).includes(name)
}

// Built-ins are seeded in the language active at install, so a name nobody
// edited follows the current language instead. A renamed built-in keeps the
// user's name.
export function builtinDisplayName(
  config: Pick<ProviderConfig, 'id' | 'manifestId' | 'name'>,
  language: string
): string {
  if (!isBuiltinConfig(config) || !isSeededName(config.id, config.name)) {
    return config.name
  }
  const names = BUILTIN_MANIFEST_NAMES[config.id]
  const base = language.split('-')[0]
  if (!names || !isLanguage(base)) {
    return config.name
  }
  return names[base]
}

export function withLocalizedBuiltinNames(
  configs: ProviderConfig[],
  language: string
): ProviderConfig[] {
  let changed = false
  const out = configs.map((config) => {
    const name = builtinDisplayName(config, language)
    if (name === config.name) {
      return config
    }
    changed = true
    return { ...config, name }
  })
  return changed ? out : configs
}
