import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { Divider } from 'primeng/divider'
import { StarRatingComponent } from '../../../shared/components/star-rating.component'
import { VirtualizedGrid } from '../../../shared/components/virtualized-grid'
import { BangumiService } from '../services/bangumi.service'
import { CommentSkeletonComponent } from './comment-skeleton.component'

@Component({
  selector: 'da-comments-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    StarRatingComponent,
    Divider,
    VirtualizedGrid,
    CommentSkeletonComponent,
  ],
  template: `
    <da-virtualized-grid
      [items]="comments()"
      [isLoading]="commentsQuery.isPending()"
      [isError]="commentsQuery.isError()"
      isInfiniteScroll
      [isFetchingNext]="commentsQuery.isFetchingNextPage()"
      [pageSize]="20"
      [estimateHeight]="120"
      [columnConfig]="1"
      (onLoadMore)="handleLoadMore()"
    >
      <ng-template #skeleton>
        <da-comment-skeleton />
      </ng-template>

      <ng-template #body let-comment="$implicit">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                [src]="comment.user.avatar.large"
                [alt]="comment.user.nickname"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p class="font-medium">{{ comment.user.nickname }}</p>
                <p class="text-sm text-gray-500">
                  {{ comment.updatedAt * 1000 | date:'yyyy-MM-dd HH:mm' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (comment.rate) {
                <da-star-rating [rating]="comment.rate" />
              }
            </div>
          </div>
          <p class="whitespace-pre-line">{{ comment.comment }}</p>
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
          <p class="text-gray-500">暂无吐槽</p>
        </div>
      </ng-template>
    </da-virtualized-grid>
  `,
})
export class CommentsTabComponent {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  commentsQuery = injectInfiniteQuery(() => {
    return {
      ...this.bangumiService.getSubjectCommentsInfiniteQueryOptions(
        this.subjectId()
      ),
      enabled: this.visited(),
    }
  })

  protected comments = computed(() => {
    if (!this.commentsQuery.isSuccess()) {
      return []
    }

    return this.commentsQuery
      .data()
      .pages.map((page) => page.data)
      .flat()
  })

  protected handleLoadMore(): void {
    if (
      this.commentsQuery.hasNextPage() &&
      !this.commentsQuery.isFetchingNextPage()
    ) {
      void this.commentsQuery.fetchNextPage()
    }
  }
}
