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
          <p class="text-sm text-gray-400 m-2">
            搜索结果 ({{ data.length }} / {{totalLength()}})
          </p>
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

  totalLength = computed(() => {
    if (!this.bangumiSearchQuery.isSuccess()) {
      return 0
    }
    return this.bangumiSearchQuery.data().pages[0]?.total ?? 0
  })

  protected bangumiSearchQuery = injectInfiniteQuery(() => {
    const model = this.searchService.$model()

    if (!model || model.provider !== 'bangumi') {
      return {
        ...this.bangumiService.searchSubjectsQueryOptions(''),
        enabled: false,
      }
    }

    // searching is done by the service, here we just listen to the query
    return {
      ...this.bangumiService.searchSubjectsQueryOptions(
        model.term,
        model.sorting,
        model.filter
      ),
      enabled: false,
    }
  })

  async navigateToDetails(id?: number): Promise<void> {
    if (!id) {
      return
    }
    await this.router.navigate(['/details', id])
    this.searchService.close()
  }
}
