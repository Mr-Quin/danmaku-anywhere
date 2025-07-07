import { JsonPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Button, ButtonDirective } from 'primeng/button'
import { Divider } from 'primeng/divider'
import { Skeleton } from 'primeng/skeleton'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { UnescapePipePipe } from '../../../shared/pipes/UrlDecodePipe'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-search-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Divider,
    JsonPipe,
    Button,
    Skeleton,
    MaterialIcon,
    UnescapePipePipe,
    ButtonDirective,
  ],
  template: `
    <div>
      @if (searchQuery.isFetching()) {
        @for (i of [1, 2, 3]; track i) {
          <p-skeleton styleClass="my-2" width="100%" height="76px" />
        }
      }

      @if (searchQuery.isError()) {
        <div>
          <p>
            搜索错误
          </p>
          <p>
            {{ searchQuery.error() | json }}
          </p>
          <p-button (onClick)="searchQuery.refetch()" label="重试" />
        </div>
      }

      @if (searchQuery.data(); as results) {
        <div>
          @if (results.length === 0) {
            <p class="p-4">无结果，请尝试其他规则</p>
          } @else {
            @for (item of results; track item.url) {
              <div class="relative">
                <div
                  role="button"
                  class="rounded p-4 cursor-pointer dark:bg-surface-900 dark:hover:bg-surface-800 transition-[background]"
                  (click)="itemClick.emit(item)"
                >
                  <h4 class="font-medium">{{ item.name | unescape }}</h4>
                  <p class="text-sm text-gray-500 overflow-hidden overflow-ellipsis">{{ item.url }}</p>
                </div>
                <a class="absolute right-0 top-0"
                   [href]="item.url" pButton text rounded severity="secondary" target="_blank" rel="noreferrer"
                >
                  <da-mat-icon icon="open_in_new" size="xl" />
                </a>
              </div>
              @if (!$last) {
                <p-divider styleClass="m-1" />
              }
            }
          }
        </div>
      }
    </div>
  `,
})
export class SearchResultsComponent {
  policy = input.required<KazumiPolicy>()
  keyword = input('')
  isActive = input(false)
  isVisited = input(false)
  itemClick = output<{ name: string; url: string }>()

  private kazumiService = inject(KazumiService)

  protected searchQuery = injectQuery(() => ({
    ...this.kazumiService.getSearchQueryOptions(this.keyword(), this.policy()),
    enabled: !!this.keyword().trim() && this.isVisited(),
  }))
}
