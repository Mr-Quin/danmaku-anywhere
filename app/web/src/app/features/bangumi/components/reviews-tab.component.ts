import { CommonModule, NgOptimizedImage } from '@angular/common'
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
  selector: 'da-reviews-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HorizontalCardSkeletonGrid,
    NgOptimizedImage,
    Divider,
    Tag,
  ],
  template: `
    @if (reviewsQuery.isPending()) {
      <da-horizontal-card-skeleton-grid [count]="5" />
    } @else if (reviewsQuery.isError()) {
      <div class="text-center py-8">
        <p class="text-red-500">加载失败，请稍后重试</p>
      </div>
    } @else if (reviewsQuery.isSuccess()) {
      @let response = reviewsQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="space-y-4">
          @for (review of response.data; track review.id) {
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
          }
        </div>

        @if (response.total > response.data.length) {
          <div class="text-center mt-6">
            <p class="text-gray-500">
              显示 {{ response.data.length }} / {{ response.total }} 条评论
            </p>
          </div>
        }
      } @else {
        <div class="text-center py-8">
          <p class="text-gray-500">暂无评论</p>
        </div>
      }
    }
  `,
})
export class ReviewsTabComponent {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected reviewsQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectReviewsQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
