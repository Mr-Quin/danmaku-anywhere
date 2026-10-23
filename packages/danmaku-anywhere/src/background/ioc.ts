import 'reflect-metadata'
import type { FetchLike } from '@mr-quin/dango'
import { Container, ContainerModule } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { bindOptionStores } from '@/common/options/bindOptionStores'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import {
  OPTION_STORES,
  OptionStoreDescriptors,
} from '@/common/options/optionStores'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import {
  ConfigSchemaSourceSymbol,
  type IProviderConfigCleanup,
  ProviderConfigCleanupSymbol,
} from '@/common/options/providerConfig/ports'
import { RestoreListCheckSymbol } from '@/common/options/RestoreListCheck'
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

export const backgroundContainerModule = new ContainerModule((options) => {
  const { bind } = options
  bindOptionStores(options)
  bind(OptionStoreDescriptors).toConstantValue(OPTION_STORES)

  bind<IDanmakuProviderFactory>(DanmakuProviderFactory).toFactory(
    danmakuProviderFactory
  )

  bind(RestoreListCheckSymbol).toService(ProviderConfigWriter)
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
