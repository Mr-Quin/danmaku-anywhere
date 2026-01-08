import 'reflect-metadata'
import { Container } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { Logger } from './backgroundLogger'
import {
  DanmakuProviderFactory,
  danmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './services/providers/ProviderFactory'

const container = new Container({ autobind: true, defaultScope: 'Singleton' })

// Bind all store services to StoreServiceSymbol
container.bind(StoreServiceSymbol).toService(ExtensionOptionsService)
container.bind(StoreServiceSymbol).toService(DanmakuOptionsService)
container.bind(StoreServiceSymbol).toService(IntegrationPolicyService)
container.bind(StoreServiceSymbol).toService(MountConfigService)
container.bind(StoreServiceSymbol).toService(ProviderConfigService)
container.bind(StoreServiceSymbol).toService(AiProviderConfigService)

// factory
container
  .bind<IDanmakuProviderFactory>(DanmakuProviderFactory)
  .toFactory(danmakuProviderFactory)

container
  .bind<IOptionsServiceFactory>(OptionsServiceFactory)
  .toFactory(optionsServiceFactory)

container.bind<ILogger>(LoggerSymbol).toConstantValue(Logger)

export { container }
