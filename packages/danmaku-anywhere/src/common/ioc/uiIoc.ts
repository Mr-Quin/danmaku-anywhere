import 'reflect-metadata'
import { Container } from 'inversify'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import { type ILogger, Logger, LoggerSymbol } from '../Logger'
import { i18n } from '../localization/i18n'
import { ExtensionOptionsService } from '../options/extensionOptions/service'

const uiContainer = new Container({ autobind: true, defaultScope: 'Singleton' })

uiContainer
  .bind<IOptionsServiceFactory>(OptionsServiceFactory)
  .toFactory(optionsServiceFactory)

uiContainer.bind<ILogger>(LoggerSymbol).toConstantValue(Logger)

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

export { uiContainer }
