import { Injectable } from '@angular/core'
import Clarity from '@microsoft/clarity'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root',
})
export class ClarityService {
  identify(userId: string) {
    Clarity.identify(userId)
  }

  track(key: string, value: string | string[]) {
    Clarity.setTag(key, value)
  }

  cookieConsent(consent: boolean) {
    Clarity.consent(consent)
  }

  init() {
    Clarity.init(environment.clarityId)
  }
}
