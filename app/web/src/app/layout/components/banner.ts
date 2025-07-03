import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MaterialIcon } from '../../shared/components/material-icon'
import { LayoutService } from '../layout.service'

@Component({
  selector: 'da-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (layoutService.$showBanner()) {
      <div class="bg-primary p-1 flex justify-center">
        <p class="text-sm text-black">
          Danmaku Anywhere说明文档转移至<a class="bold underline" href="https://docs.danmaku.weeblify.app"
                                           target="_blank">docs.danmaku.weeblify.app</a>
        </p>
        <button class="cursor-pointer text-black absolute right-0 mr-4" (click)="layoutService.hideBanner()">
          <da-mat-icon icon="close" />
        </button>
      </div>
    }
  `,
})
export class Banner {
  protected layoutService = inject(LayoutService)
}
