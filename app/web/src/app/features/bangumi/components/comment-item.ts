import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Divider } from 'primeng/divider'
import { StarRatingComponent } from '../../../shared/components/star-rating.component'
import type { BgmSubjectComment } from '../types/bangumi.types'
import { UserAvatar } from './user-avatar'

@Component({
  selector: 'da-comment-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StarRatingComponent, Divider, UserAvatar],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <da-user-avatar
            [imageUrl]="comment().user.avatar.medium"
            [altText]="comment().user.nickname"
            size="medium"
          />
          <div>
            <p class="font-medium">{{ comment().user.nickname }}</p>
            <p class="text-sm text-gray-500">
              {{ comment().updatedAt * 1000 | date:'yyyy-MM-dd HH:mm' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (comment().rate) {
            <da-star-rating [rating]="comment().rate" />
          }
        </div>
      </div>
      <p class="whitespace-pre-line">{{ comment().comment }}</p>
    </div>
    <p-divider />
  `,
})
export class CommentItem {
  comment = input.required<BgmSubjectComment>()
}
