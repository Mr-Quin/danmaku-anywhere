import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ExtensionDetector } from '../../core/backend/extension-detector'
import { Banner, type BannerConfig } from './banner.component'

@Component({
  selector: 'da-extension-update-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Banner],
  template: `
    @if (extensionService.$isOutdated()) {
      <da-banner [config]="bannerConfig">
        Danmaku Anywhere 扩展有新版本可用。当前版本 {{ extensionService.$installedVersion() }},
        最新版本 {{ extensionService.latestVersion }}。
      </da-banner>
    }
  `,
})
export class ExtensionUpdateBanner {
  protected extensionService = inject(ExtensionDetector)

  protected bannerConfig: BannerConfig = {
    type: 'warning',
    bgClass: 'bg-orange-400',
    dismissible: false,
  }
}
