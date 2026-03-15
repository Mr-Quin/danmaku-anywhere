import {
  type BootstrapContext,
  bootstrapApplication,
} from '@angular/platform-browser'
import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { App } from './app/app'
import { serverConfig } from './app/app.config.server'
import { environment } from './environments/environment'

configureApiStore({
  baseUrl: environment.apiRoot,
})

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, serverConfig, context)
export default bootstrap
