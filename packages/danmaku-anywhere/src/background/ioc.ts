import 'reflect-metadata'
import { Container } from 'inversify'
import {
  danmakuOptionsService,
  danmakuOptionsServiceSymbol,
} from '@/common/options/danmakuOptions/service'
import {
  extensionOptionsService,
  extensionOptionsServiceSymbol,
} from '@/common/options/extensionOptions/service'
import { integrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { UpgradeService } from '@/common/options/UpgradeService/UpgradeService'
import {
  DanmakuProviderFactory,
  danmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './services/providers/ProviderFactory'
import { StoreServiceSymbol } from '@/common/options/IStoreService'

const container = new Container({ autobind: true, defaultScope: 'Singleton' })

// these option services are not classes so they can't autobind with inject
container
  .bind(extensionOptionsServiceSymbol)
  .toConstantValue(extensionOptionsService)
container
  .bind(danmakuOptionsServiceSymbol)
  .toConstantValue(danmakuOptionsService)

// Bind all store services to StoreServiceSymbol
container.bind(StoreServiceSymbol).toConstantValue(extensionOptionsService)
container.bind(StoreServiceSymbol).toConstantValue(danmakuOptionsService)
container.bind(StoreServiceSymbol).toConstantValue(integrationPolicyService)
container.bind(StoreServiceSymbol).toConstantValue(mountConfigService)
container.bind(StoreServiceSymbol).toConstantValue(providerConfigService)

// factory
container
  .bind<IDanmakuProviderFactory>(DanmakuProviderFactory)
  .toFactory(danmakuProviderFactory)

// UpgradeService
container.bind(UpgradeService).toSelf().inSingletonScope()

export { container }
