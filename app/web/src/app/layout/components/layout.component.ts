import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ConfirmDialog } from 'primeng/confirmdialog'
import { ScrollTop } from 'primeng/scrolltop'
import { Toast } from 'primeng/toast'
import { PlatformService } from '../../core/services/platform.service'
import { NoExtensionPage } from '../../features/no-extension/no-extension-page'
import { Settings } from '../../features/settings/settings.component'
import { LayoutService } from '../layout.service'
import { AppBar } from './app-bar.component'
import { SearchDialogComponent } from '../../features/search/search-dialog'
import { HostListener } from '@angular/core'
import { SearchService } from '../../features/search/search.service'
import { AppFooter } from './app-footer.component'
import { AppSidebar } from './sidebar/sidebar.component'
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
    NoExtensionPage,
    ConfirmDialog,
    SearchDialogComponent,
  ],
  template: `
    <p-toast [position]="platformService.isMobile ? 'top-center' : 'bottom-center'" />
    <da-update-banner></da-update-banner>
    <p-confirmDialog />

    <div class="flex flex-col min-h-screen">
      <da-app-bar></da-app-bar>
      <div class="grow basis-0 flex">
        <da-sidebar></da-sidebar>
        <div class="grow flex flex-col">
          <div class="grow">
            @if (layoutService.$requireExtension() && !layoutService.$hasExtensionAndIsNotMobile()) {
              <da-no-extension />
            } @else {
              <router-outlet></router-outlet>
            }
          </div>
          <da-app-footer></da-app-footer>
        </div>
      </div>
    </div>
    <p-scroll-top />
    <da-settings />
    <da-search-dialog />
  `,
})
export class Layout {
  readonly platformService = inject(PlatformService)
  readonly layoutService = inject(LayoutService)
  private readonly searchService = inject(SearchService)

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    const isK = event.key.toLowerCase() === 'k'
    if ((event.ctrlKey || event.metaKey) && isK) {
      event.preventDefault()
      this.searchService.open()
    }
  }
}
