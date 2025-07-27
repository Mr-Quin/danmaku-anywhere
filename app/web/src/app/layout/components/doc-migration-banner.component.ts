import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { LayoutService } from '../layout.service'
import { Banner, type BannerConfig } from './banner.component'

@Component({
  selector: 'da-doc-migration-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Banner],
  template: `
    @if (layoutService.$showDocMigrationBanner()) {
      <da-banner 
        [config]="bannerConfig"
        (onDismiss)="layoutService.hideDocMigrationBanner()"
      >
        Danmaku Anywhere说明文档转移至
        <a class="bold underline" href="https://docs.danmaku.weeblify.app" target="_blank">
          docs.danmaku.weeblify.app
        </a>
      </da-banner>
    }
  `,
})
export class DocMigrationBanner {
  protected layoutService = inject(LayoutService)

  protected bannerConfig: BannerConfig = {
    type: 'info',
    bgClass: 'bg-primary',
    dismissible: true,
  }
}
