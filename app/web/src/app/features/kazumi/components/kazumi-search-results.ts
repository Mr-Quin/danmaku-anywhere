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
import { Button } from 'primeng/button'
import { Divider } from 'primeng/divider'
import { ProgressSpinner } from 'primeng/progressspinner'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-search-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressSpinner, Divider, JsonPipe, Button],
  template: `
    <div>
      @if (searchQuery.isFetching()) {
        <div class="text-center p-4">
          <p-progress-spinner />
        </div>
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
            <p class="p-4">无结果</p>
          } @else {
            @for (item of results; track item.url) {
              <div
                class="rounded p-4 cursor-pointer dark:bg-surface-900 dark:hover:bg-surface-800"
                (click)="itemClick.emit(item)"
              >
                <h4 class="font-medium">{{ item.name }}</h4>
                <p class="text-sm">{{ item.url }}</p>
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
