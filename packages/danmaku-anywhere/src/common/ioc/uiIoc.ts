import 'reflect-metadata'
import { Container } from 'inversify'
import { isStandaloneRuntime } from '@/common/environment/isStandalone'
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

const initializeStandalone = async () => {
  if (!isStandaloneRuntime()) return

  uiContainer.bind(StoreServiceSymbol).toService(ExtensionOptionsService)
  uiContainer.bind(StoreServiceSymbol).toService(DanmakuOptionsService)
  uiContainer.bind(StoreServiceSymbol).toService(IntegrationPolicyService)
  uiContainer.bind(StoreServiceSymbol).toService(MountConfigService)
  uiContainer.bind(StoreServiceSymbol).toService(ProviderConfigService)
  uiContainer.bind(StoreServiceSymbol).toService(AiProviderConfigService)
}

const initializeLocalization = async () => {
  try {
    const options = await uiContainer.get(ExtensionOptionsService).get()
    void i18n.changeLanguage(options.lang)
  } catch {
    Logger.error(
      'Failed to get language from extension options, fallback to default language'
    )
  }
}

void initializeStandalone().then(() => initializeLocalization())

export { uiContainer }
