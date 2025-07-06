import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { VirtualizedGrid } from '../../../shared/components/virtualized-grid'
import { BangumiService } from '../services/bangumi.service'
import { ReviewItem } from './review-item'
import { ReviewItemSkeleton } from './review-item-skeleton'

@Component({
  selector: 'da-reviews-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, VirtualizedGrid, ReviewItemSkeleton, ReviewItem],
  template: `
    <da-virtualized-grid
      [items]="reviews()"
      [isLoading]="reviewsQuery.isPending()"
      [isError]="reviewsQuery.isError()"
      isInfiniteScroll
      [isFetchingNext]="reviewsQuery.isFetchingNextPage()"
      [pageSize]="20"
      [estimateHeight]="150"
      [columnConfig]="1"
      (onLoadMore)="handleLoadMore()"
    >
      <ng-template #skeleton>
        <da-review-skeleton />
      </ng-template>

      <ng-template #body let-review="$implicit">
        <da-review-item [review]="review" />
      </ng-template>

      <ng-template #error>
        <div class="text-center py-8">
          <p class="text-red-500">加载失败，请稍后重试</p>
        </div>
      </ng-template>

      <ng-template #empty>
        <div class="text-center py-8">
          <p class="text-gray-500">暂无评论</p>
        </div>
      </ng-template>
    </da-virtualized-grid>
  `,
})
export class ReviewsTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  reviewsQuery = injectInfiniteQuery(() => {
    return {
      ...this.bangumiService.getSubjectReviewsInfiniteQueryOptions(
        this.subjectId()
      ),
      enabled: this.visited(),
    }
  })

  protected reviews = computed(() => {
    if (!this.reviewsQuery.isSuccess()) {
      return []
    }

    return this.reviewsQuery
      .data()
      .pages.map((page) => page.data)
      .flat()
  })

  protected handleLoadMore(): void {
    if (
      this.reviewsQuery.hasNextPage() &&
      !this.reviewsQuery.isFetchingNextPage()
    ) {
      void this.reviewsQuery.fetchNextPage()
    }
  }
}
