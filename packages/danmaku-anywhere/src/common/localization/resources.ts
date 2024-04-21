import enTranslation from './en/translation'
import zhTranslation from './zh/translation'

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
