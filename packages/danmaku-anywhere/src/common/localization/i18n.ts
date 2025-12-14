import { use } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { uiContainer } from '../ioc/uiIoc'
import { Logger } from '../Logger'
import { ExtensionOptionsService } from '../options/extensionOptions/service'
import { resources } from './resources'

export const i18n = use(initReactI18next)

void i18n.init({
  resources,
  lng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

uiContainer
  .get(ExtensionOptionsService)
  .get()
  .then((options) => {
    void i18n.changeLanguage(options.lang)
  })
  .catch(() => {
    Logger.error(
      'Failed to get language from extension options, fallback to default language'
    )
  })
