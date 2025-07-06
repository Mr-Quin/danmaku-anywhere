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
import { Tag } from 'primeng/tag'
import { VirtualizedGrid } from '../../../shared/components/virtualized-grid'
import { BangumiService } from '../services/bangumi.service'
import { TopicSkeletonComponent } from './topic-skeleton.component'

@Component({
  selector: 'da-topics-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Tag,
    Divider,
    VirtualizedGrid,
    TopicSkeletonComponent,
  ],
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
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                [src]="topic.creator?.avatar?.large"
                [alt]="topic.creator?.nickname"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p class="font-medium">{{ topic.creator?.nickname }}</p>
                <p class="text-sm text-gray-500">
                  {{ (topic.createdAt * 1000) | date:'yyyy-MM-dd HH:mm' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (topic.replyCount) {
                <p-tag [value]="'回复 ' + topic.replyCount" severity="info" />
              }
            </div>
          </div>
          <h3 class="text-lg font-semibold">
            {{ topic.title }}
          </h3>
        </div>
        <p-divider />
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
export class TopicsTabComponent {
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
