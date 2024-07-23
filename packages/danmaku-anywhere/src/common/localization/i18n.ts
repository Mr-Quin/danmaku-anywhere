import { use } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { defaultExtensionOptions } from '../options/extensionOptions/extensionOptions'
import { Logger } from '../services/Logger'
import { SyncOptionsService } from '../services/SyncOptionsService/SyncOptionsService'

import { resources } from './resources'

export const i18n = use(initReactI18next)

void i18n.init({
  resources,
  lng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// set default language
new SyncOptionsService('extensionOptions', defaultExtensionOptions)
  .get()
  .then((options) => {
    void i18n.changeLanguage(options.lang)
  })
  .catch(() => {
    Logger.error(
      'Failed to get language from extension options, fallback to default language'
    )
  })
