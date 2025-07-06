import { CommonModule, NgOptimizedImage } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { Divider } from 'primeng/divider'
import { Tag } from 'primeng/tag'
import { VirtualizedGrid } from '../../../shared/components/virtualized-grid'
import { BangumiService } from '../services/bangumi.service'
import { ReviewSkeletonComponent } from './review-skeleton.component'

@Component({
  selector: 'da-reviews-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NgOptimizedImage,
    Divider,
    Tag,
    VirtualizedGrid,
    ReviewSkeletonComponent,
  ],
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
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                [ngSrc]="review.user.avatar.large"
                [alt]="review.user.nickname"
                class="rounded-full object-cover"
                width="40"
                height="40"
              />
              <div>
                <p class="font-medium">{{ review.user.nickname }}</p>
                <p class="text-sm text-gray-500">
                  {{ (review.entry.createdAt * 1000) | date:'yyyy-MM-dd HH:mm' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (review.entry.replies) {
                <p-tag [value]="'回复 ' + review.entry.replies" severity="info" />
              }
            </div>
          </div>
          <h3 class="text-lg font-semibold">{{ review.entry.title }}</h3>
          <div class="max-w-none">
            <p class="whitespace-pre-line line-clamp-4">{{ review.entry.summary }}</p>
          </div>
        </div>
        <p-divider />
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
export class ReviewsTabComponent {
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
