import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Divider } from 'primeng/divider'
import { StarRatingComponent } from '../../../shared/components/star-rating.component'
import type { BgmSubjectComment } from '../types/bangumi.types'

@Component({
  selector: 'da-comment-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StarRatingComponent, Divider],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img
            [src]="comment().user.avatar.large"
            [alt]="comment().user.nickname"
            class="w-10 h-10 rounded-full object-cover"
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
