import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ScrollTop } from 'primeng/scrolltop'
import { Toast } from 'primeng/toast'
import { UpdateService } from '../../core/update/update.service'
import { Settings } from '../../features/settings/settings.component'
import { AppBar } from './app-bar'
import { AppFooter } from './app-footer'
import { CookieConsentFooter } from './cookie-consent-footer'
import { AppSidebar } from './sidebar'
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
    AppSidebar,
    ScrollTop,
    Settings,
  ],
  template: `
    <p-toast position="top-left" />
    <da-update-banner></da-update-banner>
    <da-cookie-consent-footer></da-cookie-consent-footer>

    <div class="flex flex-col min-h-screen">
      <da-app-bar></da-app-bar>
      <div class="grow basis-0 flex">
        <da-sidebar></da-sidebar>
        <div class="grow flex flex-col">
          <div class="grow">
            <router-outlet></router-outlet>
          </div>
          <da-app-footer></da-app-footer>
        </div>
      </div>
    </div>
    <p-scroll-top />
    <da-settings />
  `,
})
export class Layout {
  // initialize update service
  _ = inject(UpdateService)
}
