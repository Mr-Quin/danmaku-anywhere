import 'reflect-metadata'
import { Container, ContainerModule } from 'inversify'
import { IS_DA_E2E } from '@/common/constants'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import {
  type IMaskProviderFactory,
  MaskProviderFactory,
  maskProviderFactory,
  mockMaskProviderFactory,
} from '@/content/player/occlusion/maskProviderFactory'
import { type ILogger, Logger, LoggerSymbol } from '../Logger'
import { i18n } from '../localization/i18n'
import { AiProviderConfigService } from '../options/aiProviderConfig/service'
import { DanmakuOptionsService } from '../options/danmakuOptions/service'
import { ExtensionOptionsService } from '../options/extensionOptions/service'
import { StoreServiceSymbol } from '../options/IStoreService'
import { IntegrationPolicyService } from '../options/integrationPolicyStore/service'
import { NamingRuleService } from '../options/localMatchingRule/service'
import { MountConfigService } from '../options/mountConfig/service'
import { ProviderConfigService } from '../options/providerConfig/service'

export const uiContainerModule = new ContainerModule(({ bind }) => {
  bind<IOptionsServiceFactory>(OptionsServiceFactory).toFactory(
    optionsServiceFactory
  )

  bind<IMaskProviderFactory>(MaskProviderFactory).toFactory(
    // e2e uses a deterministic mock mask so specs don't load the real ML segmenter.
    IS_DA_E2E ? mockMaskProviderFactory : maskProviderFactory
  )

  bind<ILogger>(LoggerSymbol).toConstantValue(Logger)
})

function initializeStandalone(container: Container) {
  if (!IS_STANDALONE_RUNTIME) {
    return
  }

  // these bindings are needed in standalone mode for standalone storage setup
  container.bind(StoreServiceSymbol).toService(ExtensionOptionsService)
  container.bind(StoreServiceSymbol).toService(DanmakuOptionsService)
  container.bind(StoreServiceSymbol).toService(IntegrationPolicyService)
  container.bind(StoreServiceSymbol).toService(MountConfigService)
  container.bind(StoreServiceSymbol).toService(ProviderConfigService)
  container.bind(StoreServiceSymbol).toService(AiProviderConfigService)
  container.bind(StoreServiceSymbol).toService(NamingRuleService)
}

export function createUiContainer(): Container {
  const container = new Container({ autobind: true, defaultScope: 'Singleton' })
  container.load(uiContainerModule)
  initializeStandalone(container)
  return container
}

export function bootstrapUiLanguage(container: Container): void {
  container
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
}

export const uiContainer = createUiContainer()
