import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppBar } from './app-bar'
import { AppFooter } from './app-footer'
import { Banner } from './banner'
import { CookieConsentFooter } from './cookie-consent-footer'

@Component({
  selector: 'da-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppBar, RouterOutlet, Banner, CookieConsentFooter, AppFooter],
  template: `
    <div class="flex flex-col min-h-screen">
      <da-banner></da-banner>
      <da-app-bar></da-app-bar>
      <div class="grow basis-0">
        <router-outlet></router-outlet>
      </div>
      <da-app-footer></da-app-footer>
      <da-cookie-consent-footer></da-cookie-consent-footer>
    </div>
  `,
})
export class Layout {}
