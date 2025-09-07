import { CommonModule } from '@angular/common'
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { Router } from '@angular/router'
import { Tag } from 'primeng/tag'
import type { LegacyBgmSubject } from '../bangumi/types/bangumi.types'
import { SearchListItem } from './search-list-item.component'

@Component({
  selector: 'da-bangumi-search-result-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Tag, SearchListItem],
  template: `
    @let item = subject();
    <da-search-list-item (click)="navigateToDetails(item.id)">
      <div class="flex gap-3">
        <div class="w-16 h-24 shrink-0 overflow-hidden rounded-md bg-surface-700">
          <img
            [src]="$imageSrc()"
            [alt]="$primaryName()"
            class="object-cover w-full h-full"
            width="160"
            height="240"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-base font-medium overflow-hidden text-ellipsis whitespace-nowrap" [title]="$primaryName()">
            {{ $primaryName() }}
          </p>
          @if (!hideAltTitle() && $secondaryName()) {
            <p class="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap"
               [title]="$secondaryName()">
              {{ $secondaryName() }}
            </p>
          }
          <div class="flex flex-wrap gap-2 mt-1">
            @for (tag of item.meta_tags; track tag) {
              <p-tag
                severity="info"
                class="text-xs"
              >
                <span>{{ tag }}</span>
              </p-tag>
            }
          </div>
          <p class="text-sm text-gray-500">
            {{ item.date }}
          </p>
        </div>
      </div>
      <div class="absolute top-1 right-1 flex flex-col items-end">
        @let rank = item.rating.rank;
        @let score = item.rating.score;
        <div class="flex gap-2">
          @if (rank && rank > 0) {
            <p-tag [value]="'#' + rank" severity="info" class="font-bold bg-cyan-950 text-xs" />
          }
          @if (score !== undefined) {
            <p-tag [value]="score.toFixed(1)" severity="secondary" class="font-bold text-xs" />
          }
        </div>
        <p class="text-sm text-gray-500">
          {{ item.rating.total }}人评分
        </p>
      </div>
    </da-search-list-item>
  `,
})
export class BangumiSearchResultListItem {
  private readonly router = inject(Router)

  subject = input.required<LegacyBgmSubject>()
  hideAltTitle = input(false, { transform: booleanAttribute })

  $imageSrc = computed(() => {
    const item = this.subject()
    return item.images?.grid ?? item.images?.medium ?? item.images?.large ?? ''
  })

  $primaryName = computed(() => {
    const item = this.subject()
    return item.name_cn || item.name
  })

  $secondaryName = computed(() => {
    const item = this.subject()
    return item.name_cn && item.name && item.name !== item.name_cn
      ? item.name
      : ''
  })

  navigateToDetails(id?: number): void {
    if (!id) {
      return
    }
    void this.router.navigate(['/details', id])
  }
}
