import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Divider } from 'primeng/divider'
import { Tag } from 'primeng/tag'
import type { BgmTopic } from '../types/bangumi.types'
import { UserAvatar } from './user-avatar'

@Component({
  selector: 'da-topic-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Tag, Divider, UserAvatar],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <da-user-avatar
            [imageUrl]="topic().creator?.avatar?.large"
            [altText]="topic().creator?.nickname"
            size="medium"
            [useOptimizedImage]="false"
          />
          <div>
            <p class="font-medium">{{ topic().creator?.nickname }}</p>
            <p class="text-sm text-gray-500">
              {{ (topic().createdAt * 1000) | date:'yyyy-MM-dd HH:mm' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (topic().replyCount) {
            <p-tag [value]="'回复 ' + topic().replyCount" severity="info" />
          }
        </div>
      </div>
      <h3 class="text-lg font-semibold">
        {{ topic().title }}
      </h3>
    </div>
    <p-divider />
  `,
})
export class TopicItem {
  topic = input.required<BgmTopic>()
}
