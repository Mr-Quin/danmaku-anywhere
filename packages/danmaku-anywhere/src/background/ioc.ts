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
import {
  DanmakuProviderFactory,
  danmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './services/providers/ProviderFactory'

const container = new Container({ autobind: true })

// these option services are not classes so they can't autobind with inject
container
  .bind(extensionOptionsServiceSymbol)
  .toConstantValue(extensionOptionsService)
container
  .bind(danmakuOptionsServiceSymbol)
  .toConstantValue(danmakuOptionsService)

// factory
container
  .bind<IDanmakuProviderFactory>(DanmakuProviderFactory)
  .toFactory(danmakuProviderFactory)

export { container }
