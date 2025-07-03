import { bootstrapApplication } from '@angular/platform-browser'
import Clarity from '@microsoft/clarity'
import { App } from './app/app'
import { appConfig } from './app/app.config'
import { environment } from './environments/environment'

Clarity.init(environment.clarityId)

bootstrapApplication(App, appConfig).catch((err) => console.error(err))
