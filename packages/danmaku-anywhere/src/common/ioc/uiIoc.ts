import 'reflect-metadata'
import { Container } from 'inversify'

const container = new Container({ autobind: true, defaultScope: 'Singleton' })

const uiContainer = container

export { uiContainer }
