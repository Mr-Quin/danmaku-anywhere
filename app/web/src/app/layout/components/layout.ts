import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { MaterialIcon } from '../../shared/components/material-icon'
import { LayoutService } from '../layout.service'
import { AppBar } from './app-bar'

@Component({
  selector: 'da-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppBar, RouterOutlet, MaterialIcon],
  template: `
    <div class="flex flex-col min-h-screen">
      @if (layoutService.$showBanner()) {
        <div class="bg-primary p-1 flex justify-center">
          <p class="text-sm text-black">
            Danmaku Anywhere说明文档转移至<a class="bold underline" href="https://danmaku.weeblify.app/docs"
                                             target="_blank">danmaku.weeblify.app/docs</a>
          </p>
          <button class="cursor-pointer text-black absolute right-0 mr-4" (click)="layoutService.hideBanner()">
            <da-mat-icon icon="close" />
          </button>
        </div>
      }
      <da-app-bar></da-app-bar>
      <div class="grow basis-0">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class Layout {
  protected layoutService = inject(LayoutService)
}
