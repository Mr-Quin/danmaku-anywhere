import 'reflect-metadata'
import { Container } from 'inversify'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import { type ILogger, Logger, LoggerSymbol } from '../Logger'

const uiContainer = new Container({ autobind: true, defaultScope: 'Singleton' })

uiContainer
  .bind<IOptionsServiceFactory>(OptionsServiceFactory)
  .toFactory(optionsServiceFactory)

uiContainer.bind<ILogger>(LoggerSymbol).toConstantValue(Logger)

export { uiContainer }
