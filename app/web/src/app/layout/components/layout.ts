import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { Toast } from 'primeng/toast'
import { AppBar } from './app-bar'
import { AppFooter } from './app-footer'
import { CookieConsentFooter } from './cookie-consent-footer'

@Component({
  selector: 'da-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppBar, RouterOutlet, CookieConsentFooter, AppFooter, Toast],
  template: `
    <p-toast position="top-left"/>
    <div class="flex flex-col min-h-screen">
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
