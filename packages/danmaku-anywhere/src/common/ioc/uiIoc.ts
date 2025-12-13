import 'reflect-metadata'
import { Container } from 'inversify'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'

const container = new Container({ autobind: true, defaultScope: 'Singleton' })

const uiContainer = container

uiContainer
  .bind<IOptionsServiceFactory>(OptionsServiceFactory)
  .toFactory(optionsServiceFactory)

export { uiContainer }
