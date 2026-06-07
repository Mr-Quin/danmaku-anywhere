export enum Language {
  en = 'en',
  zh = 'zh',
}

// Map the app's bare language code to the BCP-47 tag (e.g. `zh-CN`) that
// localized manifest strings are keyed by.
export function toManifestLocale(language: string): string {
  if (language === Language.zh) {
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
