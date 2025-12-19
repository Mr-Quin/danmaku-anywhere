import { Injectable } from '@angular/core'
import { type Core, clarity } from 'clarity-js'
import { environment } from '../../environments/environment'

const clarityOptions: Core.Config = {
  projectId: environment.production ? 's8zgeod7h4' : 's8yylv4jnd',
  upload: 'https://m.clarity.ms/collect',
  track: true,
  content: true,
}

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  identify(userId: string) {
    clarity.identify(userId)
  }

  tag(key: string, value: string) {
    clarity.set(key, value)
  }

  track(key: string, data?: object) {
    try {
      clarity.event(key, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  init() {
    clarity.start(clarityOptions)
    this.tag('env', environment.name)
  }
}
