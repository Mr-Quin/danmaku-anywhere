import 'reflect-metadata'
import { Container } from 'inversify'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import { type ILogger, Logger, LoggerSymbol } from '../Logger'
import { i18n } from '../localization/i18n'
import { AiProviderConfigService } from '../options/aiProviderConfig/service'
import { DanmakuOptionsService } from '../options/danmakuOptions/service'
import { ExtensionOptionsService } from '../options/extensionOptions/service'
import { StoreServiceSymbol } from '../options/IStoreService'
import { IntegrationPolicyService } from '../options/integrationPolicyStore/service'
import { MountConfigService } from '../options/mountConfig/service'
import { ProviderConfigService } from '../options/providerConfig/service'

const uiContainer = new Container({ autobind: true, defaultScope: 'Singleton' })

uiContainer
  .bind<IOptionsServiceFactory>(OptionsServiceFactory)
  .toFactory(optionsServiceFactory)

uiContainer.bind<ILogger>(LoggerSymbol).toConstantValue(Logger)

function initializeStandalone() {
  if (!IS_STANDALONE_RUNTIME) {
    return
  }

  // these bindings are needed in standalone mode for standalone storage setup
  uiContainer.bind(StoreServiceSymbol).toService(ExtensionOptionsService)
  uiContainer.bind(StoreServiceSymbol).toService(DanmakuOptionsService)
  uiContainer.bind(StoreServiceSymbol).toService(IntegrationPolicyService)
  uiContainer.bind(StoreServiceSymbol).toService(MountConfigService)
  uiContainer.bind(StoreServiceSymbol).toService(ProviderConfigService)
  uiContainer.bind(StoreServiceSymbol).toService(AiProviderConfigService)
}

initializeStandalone()

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
