import 'reflect-metadata'
import type { FetchLike } from '@mr-quin/dango'
import { Container, ContainerModule } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { NamingRuleService } from '@/common/options/localMatchingRule/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import {
  ConfigSchemaSourceSymbol,
  type IProviderConfigCleanup,
  ProviderConfigCleanupSymbol,
} from '@/common/options/providerConfig/ports'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { RestoreEntryCheckSymbol } from '@/common/options/RestoreEntryCheck'
import { SearchHistoryService } from '@/common/options/searchHistory/service'
import { UserAuthStore } from '@/common/options/userAuth/service'
import { Logger } from './backgroundLogger'
import { BookmarkService } from './services/persistence/BookmarkService'
import {
  createExtensionFetchLike,
  ManifestFetcherSymbol,
} from './services/providers/extensionFetchLike'
import { ManifestConfigSchemaSource } from './services/providers/ManifestConfigSchemaSource'
import {
  DanmakuProviderFactory,
  danmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './services/providers/ProviderFactory'

export const backgroundContainerModule = new ContainerModule(({ bind }) => {
  bind(StoreServiceSymbol).toService(ExtensionOptionsService)
  bind(StoreServiceSymbol).toService(DanmakuOptionsService)
  bind(StoreServiceSymbol).toService(IntegrationPolicyService)
  bind(StoreServiceSymbol).toService(MountConfigService)
  bind(StoreServiceSymbol).toService(ProviderConfigService)
  bind(StoreServiceSymbol).toService(AiProviderConfigService)
  bind(StoreServiceSymbol).toService(SearchHistoryService)
  bind(StoreServiceSymbol).toService(NamingRuleService)
  bind(StoreServiceSymbol).toService(UserAuthStore)

  bind<IDanmakuProviderFactory>(DanmakuProviderFactory).toFactory(
    danmakuProviderFactory
  )

  bind(RestoreEntryCheckSymbol).toService(ProviderConfigWriter)
  bind(ConfigSchemaSourceSymbol).toService(ManifestConfigSchemaSource)
  bind<IProviderConfigCleanup>(ProviderConfigCleanupSymbol).toDynamicValue(
    (context) => {
      const bookmarks = context.get(BookmarkService)
      return {
        beforeDelete: (id) => bookmarks.deleteByProviderConfig(id),
      }
    }
  )

  bind<FetchLike>(ManifestFetcherSymbol).toDynamicValue((context) => {
    const extensionOptions = context.get(ExtensionOptionsService)
    return createExtensionFetchLike(async () => {
      const { restrictInitiatorDomain } = await extensionOptions.get()
      return restrictInitiatorDomain !== false
    })
  })

  bind<IOptionsServiceFactory>(OptionsServiceFactory).toFactory(
    optionsServiceFactory
  )

  bind<ILogger>(LoggerSymbol).toConstantValue(Logger)
})

export function createBackgroundContainer(): Container {
  const backgroundContainer = new Container({
    autobind: true,
    defaultScope: 'Singleton',
  })
  backgroundContainer.load(backgroundContainerModule)
  return backgroundContainer
}

export const container = createBackgroundContainer()
