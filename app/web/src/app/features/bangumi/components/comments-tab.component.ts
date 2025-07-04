import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Divider } from 'primeng/divider'
import { ProgressSpinner } from 'primeng/progressspinner'
import { StarRatingComponent } from '../../../shared/components/star-rating.component'
import { BangumiService } from '../services/bangumi.service'

@Component({
  selector: 'da-comments-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressSpinner, StarRatingComponent, Divider],
  template: `
    @if (commentsQuery.isPending()) {
      <div class="flex justify-center items-center py-8">
        <p-progress-spinner />
      </div>
    } @else if (commentsQuery.isError()) {
      <div class="text-center py-8">
        <p class="text-red-500">加载失败，请稍后重试</p>
      </div>
    } @else if (commentsQuery.isSuccess()) {
      @let response = commentsQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="space-y-4">
          @for (comment of response.data; track comment.id) {
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
          }
        </div>

        @if (response.total > response.data.length) {
          <div class="text-center mt-6">
            <p class="text-gray-500">
              显示 {{ response.data.length }} / {{ response.total }} 条吐槽
            </p>
          </div>
        }
      } @else {
        <div class="text-center py-8">
          <p class="text-gray-500">暂无吐槽</p>
        </div>
      }
    }
  `,
})
export class CommentsTabComponent {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected commentsQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectCommentsQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
