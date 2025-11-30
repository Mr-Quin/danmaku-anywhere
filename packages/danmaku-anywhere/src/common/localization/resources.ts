import enTranslation from './locales/en/translation.json' with { type: 'json' }
import zhTranslation from './locales/zh/translation.json' with { type: 'json' }

export const resources = {
  en: {
    translation: enTranslation,
  },
  zh: {
    translation: zhTranslation,
  },
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof enTranslation
  }
}
