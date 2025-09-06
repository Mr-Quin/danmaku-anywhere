import { CommonModule, NgOptimizedImage } from '@angular/common'
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { Router } from '@angular/router'
import { Tag } from 'primeng/tag'
import type { LegacyBgmSubject } from '../types/bangumi.types'

@Component({
  selector: 'da-bangumi-search-result-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgOptimizedImage, Tag],
  template: `
    @let item = subject();
    <div class="flex gap-3 cursor-pointer hover:bg-surface-800/30 rounded-md p-2" (click)="navigateToDetails(item.id)">
      <div class="relative w-16 h-24 shrink-0 overflow-hidden rounded-md bg-surface-700">
        <img
          [ngSrc]="item.images?.grid ?? item.images?.medium ?? item.images?.large ?? ''"
          [alt]="item.name_cn || item.name || ''"
          class="object-cover w-full h-full"
          width="160"
          height="240"
        />
<!--        @if (item.rank && item.rank > 0) {-->
<!--          <div class="absolute top-1 left-1">-->
<!--            <p-tag [value]="'#' + item.rank" severity="info" class="font-bold bg-cyan-950 text-xs" />-->
<!--          </div>-->
<!--        }-->
        @if (item.rating?.score !== undefined) {
          <div class="absolute top-1 right-1">
            <p-tag [value]="item.rating!.score!.toFixed(1)" severity="secondary" class="font-bold text-xs" />
          </div>
        }
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-base font-medium overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.name_cn || item.name">
          {{ item.name_cn || item.name }}
        </p>
        @if (!hideAltTitle() && item.name_cn && item.name && item.name !== item.name_cn) {
          <p class="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
            {{ item.name }}
          </p>
        }
      </div>
    </div>
  `,
})
export class BangumiSearchResultListItem {
  subject = input.required<LegacyBgmSubject>()
  hideAltTitle = input(false, { transform: booleanAttribute })

  private router = inject(Router)

  navigateToDetails(id?: number): void {
    if (!id) return
    void this.router.navigate(['/details', id])
  }
}
