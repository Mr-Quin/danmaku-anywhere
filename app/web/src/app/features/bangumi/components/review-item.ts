import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Divider } from 'primeng/divider'
import { Tag } from 'primeng/tag'
import type { BgmSubjectReview } from '../types/bangumi.types'
import { UserAvatar } from './user-avatar'

@Component({
  selector: 'da-review-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Divider, Tag, UserAvatar],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <da-user-avatar
            [imageUrl]="review().user.avatar.large"
            [altText]="review().user.nickname"
            size="medium"
          />
          <div>
            <p class="font-medium">{{ review().user.nickname }}</p>
            <p class="text-sm text-gray-500">
              {{ (review().entry.createdAt * 1000) | date:'yyyy-MM-dd HH:mm' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (review().entry.replies) {
            <p-tag [value]="'回复 ' + review().entry.replies" severity="info" />
          }
        </div>
      </div>
      <h3 class="text-lg font-semibold">{{ review().entry.title }}</h3>
      <div class="max-w-none">
        <p class="whitespace-pre-line line-clamp-4">{{ review().entry.summary }}</p>
      </div>
    </div>
    <p-divider />
  `,
})
export class ReviewItem {
  review = input.required<BgmSubjectReview>()
}
