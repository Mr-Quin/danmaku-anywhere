import { JsonPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { InputTextModule } from 'primeng/inputtext'
import { Skeleton } from 'primeng/skeleton'
import { BangumiService } from '../../bangumi/services/bangumi.service'
import { SearchService } from '../search.service'
import { BangumiSearchResultListItem } from './search-result-list-item-bangumi.component'

@Component({
  selector: 'da-search-result-bangumi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JsonPipe,
    FormsModule,
    InputTextModule,
    Skeleton,
    BangumiSearchResultListItem,
  ],
  template: `
    <div class="overflow-auto">
      @if (bangumiSearchQuery.isPending()) {
        @if (bangumiSearchQuery.isFetching()) {
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <p-skeleton class="my-2" width="100%" height="76px" />
          }
        }
      } @else if (bangumiSearchQuery.isSuccess()) {
        @let data = searchResults();
        @if (data.length === 0) {
          <p class="text-center h-full">
            无结果
          </p>
        } @else {
          <ul class="flex flex-col divide-y divide-surface-700/60">
            @for (item of data; track item.id) {
              <da-bangumi-search-result-list-item [subject]="item" (onSelect)="navigateToDetails(item.id)" />
            }
          </ul>
        }
      } @else if (bangumiSearchQuery.isError()) {
        <p>
          搜索错误
        </p>
        <p>
          {{ bangumiSearchQuery.error() | json }}
        </p>
      }
    </div>
  `,
  host: {
    class: 'h-full',
  },
})
export class SearchResultListBangumiComponent {
  private readonly searchService = inject(SearchService)
  private readonly router = inject(Router)

  private bangumiService = inject(BangumiService)

  searchResults = computed(() => {
    if (!this.bangumiSearchQuery.isSuccess()) {
      return []
    }
    return this.bangumiSearchQuery.data().pages.flatMap((page) => page.data)
  })

  protected bangumiSearchQuery = injectInfiniteQuery(() => {
    return {
      ...this.bangumiService.searchSubjectsQueryOptions(
        this.searchService.$term()
      ),
      enabled:
        this.searchService.$provider() === 'bangumi' &&
        this.searchService.$term().trim() !== '',
    }
  })

  navigateToDetails(id?: number): void {
    if (!id) {
      return
    }
    void this.router.navigate(['/details', id])
    this.searchService.close()
  }
}
