export enum Language {
  en = 'en',
  zh = 'zh',
}

// Map the app's bare language code to a BCP-47 locale tag (e.g. `zh` -> `zh-CN`).
export function toManifestLocale(language?: string): string {
  if (!language) {
    return Language.en
  }
  if (language.startsWith('zh')) {
    return 'zh-CN'
  }
  return language
}

export const LanguageList = [
  {
    value: Language.en,
    label: 'English',
  },
  {
    value: Language.zh,
    label: '中文',
  },
]
