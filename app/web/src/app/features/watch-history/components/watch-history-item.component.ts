// Watch history item component

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Tag } from 'primeng/tag'
import { Tooltip } from 'primeng/tooltip'
import type { WatchHistoryEntry } from '../../../core/services/watch-history.db'
import { UnescapePipePipe } from '../../../shared/pipes/UrlDecodePipe'

@Component({
  selector: 'da-watch-history-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Button, Tag, UnescapePipePipe, Tooltip],
  template: `
    <p-card styleClass="overflow-hidden">
      <div class="flex gap-4">
        @if (entry().posterUrl) {
          <div class="flex-shrink-0">
            <img
              [src]="entry().posterUrl"
              [alt]="entry().title"
              class="w-16 h-20 object-cover rounded"
            />
          </div>
        }
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1 min-w-0">
              @if (showTitle()) {
                <h3 class="font-semibold text-lg truncate">
                  {{ entry().title | unescape }}
                </h3>
              }
              <p class="text-sm text-gray-600 truncate">
                {{ entry().episodeName | unescape }}
              </p>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <p-tag
                [value]="entry().policyName"
                severity="secondary"
                size="small"
              />
              <p-button
                icon="pi pi-play"
                severity="success"
                size="small"
                [text]="true"
                (onClick)="onRewatch.emit()"
                pTooltip="重新观看"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                [text]="true"
                (onClick)="onDelete.emit()"
                pTooltip="删除"
              />
            </div>
          </div>
          <div class="flex justify-between items-center text-sm text-gray-500">
            <span>{{ formatWatchTime(entry().lastWatchedAt) }}</span>
            @let duration = entry().duration;
            @let watchedDuration = entry().watchedDuration;
            @if (duration && watchedDuration) {
              <span>
                {{ formatDuration(watchedDuration) }} / {{ formatDuration(duration) }}
              </span>
            }
          </div>
        </div>
      </div>
    </p-card>
  `,
})
export class WatchHistoryItem {
  entry = input.required<WatchHistoryEntry>()
  showTitle = input(true)

  onRewatch = output<void>()
  onDelete = output<void>()

  protected formatWatchTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return (
        '今天 ' +
        date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      )
    }
    if (diffDays === 1) {
      return (
        '昨天 ' +
        date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      )
    }
    if (diffDays < 7) {
      return `${diffDays}天前`
    }
    return date.toLocaleDateString('zh-CN')
  }

  protected formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}
