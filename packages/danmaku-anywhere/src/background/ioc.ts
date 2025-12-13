import 'reflect-metadata'
import { Container } from 'inversify'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { integrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { UpgradeService } from '@/common/options/UpgradeService/UpgradeService'
import {
  DanmakuProviderFactory,
  danmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './services/providers/ProviderFactory'

const container = new Container({ autobind: true, defaultScope: 'Singleton' })

// Bind all store services to StoreServiceSymbol
container.bind(StoreServiceSymbol).toService(ExtensionOptionsService)
container.bind(StoreServiceSymbol).toService(DanmakuOptionsService)
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
