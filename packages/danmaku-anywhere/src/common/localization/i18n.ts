import { use } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from './resources'

export const i18n = use(initReactI18next)

void i18n.init({
  resources,
  lng: 'en',
  interpolation: {
    escapeValue: false,
  },
})
