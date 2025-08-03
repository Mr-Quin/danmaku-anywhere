import { bootstrapApplication } from '@angular/platform-browser'
import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { App } from './app/app'
import { appConfig } from './app/app.config'
import { environment } from './environments/environment'

configureApiStore({
  baseUrl: environment.apiRoot,
})

bootstrapApplication(App, appConfig).catch((err) => console.error(err))
