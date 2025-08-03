import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ScrollTop } from 'primeng/scrolltop'
import { Toast } from 'primeng/toast'
import { TitleService } from '../../core/services/title.service'
import { UpdateService } from '../../core/update/update.service'
import { Settings } from '../../features/settings/settings.component'
import { AppBar } from './app-bar.component'
import { AppFooter } from './app-footer.component'
import { AppSidebar } from './sidebar.component'
import { UpdateBanner } from './update-banner.component'

@Component({
  selector: 'da-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppBar,
    RouterOutlet,
    AppFooter,
    Toast,
    UpdateBanner,
    AppSidebar,
    ScrollTop,
    Settings,
  ],
  template: `
    <p-toast position="bottom-center" />
    <da-update-banner></da-update-banner>

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
  constructor() {
    inject(UpdateService)
    inject(TitleService)
  }
}
