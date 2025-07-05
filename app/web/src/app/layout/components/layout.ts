import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { Toast } from 'primeng/toast'
import { UpdateService } from '../../core/update/update.service'
import { AppBar } from './app-bar'
import { AppFooter } from './app-footer'
import { CookieConsentFooter } from './cookie-consent-footer'
import { UpdateBanner } from './update-banner'

@Component({
  selector: 'da-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppBar,
    RouterOutlet,
    CookieConsentFooter,
    AppFooter,
    Toast,
    UpdateBanner,
  ],
  template: `
    <p-toast position="top-left"/>
    <div class="flex flex-col min-h-screen">
      <da-app-bar></da-app-bar>
      <div class="grow basis-0">
        <router-outlet></router-outlet>
      </div>
      <da-update-banner></da-update-banner>
      <da-app-footer></da-app-footer>
      <da-cookie-consent-footer></da-cookie-consent-footer>
    </div>
  `,
})
export class Layout {
  constructor() {
    // Initialize the update service
    inject(UpdateService)
  }
}
