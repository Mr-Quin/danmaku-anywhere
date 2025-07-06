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
import { TopicItem } from './topic-item'
import { TopicItemSkeleton } from './topic-item-skeleton'

@Component({
  selector: 'da-topics-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, VirtualizedGrid, TopicItemSkeleton, TopicItem],
  template: `
    <da-virtualized-grid
      [items]="topics()"
      [isLoading]="topicsQuery.isPending()"
      [isError]="topicsQuery.isError()"
      isInfiniteScroll
      [isFetchingNext]="topicsQuery.isFetchingNextPage()"
      [pageSize]="20"
      [estimateHeight]="120"
      [columnConfig]="1"
      (onLoadMore)="handleLoadMore()"
    >
      <ng-template #skeleton>
        <da-topic-skeleton />
      </ng-template>

      <ng-template #body let-topic="$implicit">
        <da-topic-item [topic]="topic" />
      </ng-template>

      <ng-template #error>
        <div class="text-center py-8">
          <p class="text-red-500">加载讨论失败</p>
        </div>
      </ng-template>

      <ng-template #empty>
        <div class="text-center py-8">
          <p class="text-gray-500">暂无讨论</p>
        </div>
      </ng-template>
    </da-virtualized-grid>
  `,
})
export class TopicsTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  topicsQuery = injectInfiniteQuery(() => {
    return {
      ...this.bangumiService.getSubjectTopicsInfiniteQueryOptions(
        this.subjectId()
      ),
      enabled: this.visited(),
    }
  })

  protected topics = computed(() => {
    if (!this.topicsQuery.isSuccess()) {
      return []
    }

    return this.topicsQuery
      .data()
      .pages.map((page) => page.data)
      .flat()
  })

  protected handleLoadMore(): void {
    if (
      this.topicsQuery.hasNextPage() &&
      !this.topicsQuery.isFetchingNextPage()
    ) {
      void this.topicsQuery.fetchNextPage()
    }
  }
}
