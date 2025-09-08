import { JsonPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { InputTextModule } from 'primeng/inputtext'
import { Skeleton } from 'primeng/skeleton'
import { VirtualizedGrid } from '../../../shared/components/virtualized-grid'
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
    VirtualizedGrid,
  ],
  template: `
    <p class="text-sm text-gray-400 m-2">
      搜索结果 ({{ $searchResults().length }} / {{ $totalLength() }})
    </p>
    <div class="overflow-auto" #scrollElement>
    <da-virtualized-grid
      [items]="$searchResults()"
      [isLoading]="bangumiSearchQuery.isPending()"
      [isError]="bangumiSearchQuery.isError()"
      isInfiniteScroll
      [isFetchingNext]="bangumiSearchQuery.isFetchingNextPage()"
      [pageSize]="10"
      [estimateHeight]="96"
      [gap]="0"
      [columnConfig]="1"
      (onLoadMore)="handleLoadMore()"
      [windowVirtualizer]="false"
      [scrollElement]="$scrollElement()"
    >
      <ng-template #skeleton>
        <p-skeleton class="my-2" width="100%" height="76px" />
      </ng-template>

      <ng-template #body let-subject="$implicit">
        <da-bangumi-search-result-list-item [subject]="subject" (onSelect)="navigateToDetails(subject.id)" />
      </ng-template>

      <ng-template #error>
        <p class="text-center py-8">搜索错误</p>
        <p>
          {{ bangumiSearchQuery.error() | json }}
        </p>
      </ng-template>

      <ng-template #empty>
        <p class="text-center py-8">无结果</p>
      </ng-template>
    </da-virtualized-grid>
    </div>
  `,
  host: {
    class: 'h-full flex flex-col',
  },
})
export class SearchResultListBangumiComponent {
  private readonly searchService = inject(SearchService)
  private readonly router = inject(Router)

  private bangumiService = inject(BangumiService)

  $scrollElement =
    viewChild.required<ElementRef<HTMLDivElement>>('scrollElement')

  $searchResults = computed(() => {
    if (!this.bangumiSearchQuery.isSuccess()) {
      return []
    }
    return this.bangumiSearchQuery.data().pages.flatMap((page) => page.data)
  })

  $totalLength = computed(() => {
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

  protected handleLoadMore(): void {
    if (
      this.bangumiSearchQuery.hasNextPage() &&
      !this.bangumiSearchQuery.isFetchingNextPage()
    ) {
      void this.bangumiSearchQuery.fetchNextPage()
    }
  }
}
