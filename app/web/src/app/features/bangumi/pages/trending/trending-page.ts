import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { VirtualizedGrid } from '../../../../shared/components/virtualized-grid'
import { ShowCard, type ShowCardData } from '../../components/show-card'
import { ShowCardSkeleton } from '../../components/show-card-skeleton'
import { BangumiService } from '../../services/bangumi.service'
import type { BgmSlimSubject } from '../../types/bangumi.types'

@Component({
  selector: 'da-trending-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ShowCard, ShowCardSkeleton, VirtualizedGrid],
  template: `
    <div class="container mx-auto p-4">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">热门动画</h1>
      </div>

      <da-virtualized-grid
        [items]="gridItems()"
        [isLoading]="trendingQuery.isPending()"
        [isError]="trendingQuery.isError()"
        isInfiniteScroll
        [isFetchingNext]="trendingQuery.isFetchingNextPage()"
        [pageSize]="20"
        [columnConfig]="columnConfig"
        (onLoadMore)="handleLoadMore()"
      >
        <ng-template #skeleton>
          <da-show-card-skeleton />
        </ng-template>

        <ng-template #body let-item="$implicit">
          <da-show-card [show]="item" />
        </ng-template>

        <ng-template #error>
          <div class="text-center py-12">
            <p class="text-red-500">加载失败，请稍后重试</p>
          </div>
        </ng-template>

        <ng-template #empty>
          <div slot="empty" class="text-center py-12">
            <p class="text-gray-500">暂无数据</p>
          </div>
        </ng-template>
      </da-virtualized-grid>
    </div>
  `,
})
export class TrendingPage {
  protected bangumiService = inject(BangumiService)

  protected columnConfig = {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6,
  }

  trendingQuery = injectInfiniteQuery(() => {
    return this.bangumiService.getTrendingInfiniteQueryOptions()
  })

  protected gridItems = computed(() => {
    if (!this.trendingQuery.isSuccess()) {
      return []
    }

    const data = this.trendingQuery
      .data()
      .pages.map((page) => page.data)
      .flat()
    return data.map((item) => this.transformToShowCardData(item.subject))
  })

  protected handleLoadMore(): void {
    if (
      this.trendingQuery.hasNextPage() &&
      !this.trendingQuery.isFetchingNextPage()
    ) {
      void this.trendingQuery.fetchNextPage()
    }
  }

  protected transformToShowCardData(subject: BgmSlimSubject): ShowCardData {
    return {
      id: subject.id,
      altTitle: subject.name,
      title: subject.nameCN || subject.name,
      rating: subject.rating,
      rank: subject.rating.rank,
      cover: subject.images?.large,
    }
  }
}
