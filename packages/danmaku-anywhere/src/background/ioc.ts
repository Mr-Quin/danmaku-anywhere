import 'reflect-metadata'
import { Container, ContainerModule } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { bindOptionStores } from '@/common/options/bindOptionStores'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import {
  OPTION_STORES,
  OptionStoreDescriptors,
} from '@/common/options/optionStores'
import { Logger } from './backgroundLogger'
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
