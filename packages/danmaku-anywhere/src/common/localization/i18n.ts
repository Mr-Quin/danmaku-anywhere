import { use } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { Logger } from '../Logger'
import { defaultExtensionOptions } from '../options/extensionOptions/constant'

import { resources } from './resources'

import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const i18n = use(initReactI18next)

void i18n.init({
  resources,
  lng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// set default language
new OptionsService('extensionOptions', defaultExtensionOptions)
  .get()
  .then((options) => {
    void i18n.changeLanguage(options.lang)
  })
  .catch(() => {
    Logger.error(
      'Failed to get language from extension options, fallback to default language'
    )
  })
