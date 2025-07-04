import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Divider } from 'primeng/divider'
import { Tag } from 'primeng/tag'
import { BangumiService } from '../services/bangumi.service'
import { HorizontalCardSkeletonGrid } from './horizontal-card-skeleton-grid'

@Component({
  selector: 'da-topics-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Tag, HorizontalCardSkeletonGrid, Divider],
  template: `
    @if (topicsQuery.isPending()) {
      <da-horizontal-card-skeleton-grid [count]="5" />
    } @else if (topicsQuery.isSuccess()) {
      @let response = topicsQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="space-y-4">
          @for (topic of response.data; track topic.id) {
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
          }
        </div>

        @if (response.total > response.data.length) {
          <div class="text-center mt-6">
            <p class="text-gray-500">
              显示 {{ response.data.length }} / {{ response.total }} 个讨论
            </p>
          </div>
        }
      } @else {
        <div class="text-center py-8">
          <p class="text-gray-500">暂无讨论</p>
        </div>
      }
    } @else {
      <div class="text-center py-8">
        <p class="text-red-500">加载讨论失败</p>
      </div>
    }
  `,
})
export class TopicsTabComponent {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected topicsQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectTopicsQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
