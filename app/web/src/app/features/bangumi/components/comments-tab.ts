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
import { CommentItem } from './comment-item'
import { CommentItemSkeleton } from './comment-item-skeleton'

@Component({
  selector: 'da-comments-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, VirtualizedGrid, CommentItemSkeleton, CommentItem],
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
        <da-comment-item [comment]="comment" />
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
export class CommentsTab {
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
