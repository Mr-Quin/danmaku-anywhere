import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Tag } from 'primeng/tag'
import { SearchListItem } from '../search-list-item.component'
import type { SearchHistoryEntry } from '../search-model.type'

@Component({
  selector: 'da-search-history-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchListItem, Tag, Button],
  template: `
    <da-search-list-item (select)="handleClick()">
      @let item = entry();
      <div class="flex items-center gap-3 min-h-10">
        <p-tag
          severity="secondary"
          class="text-xs"
        >
          {{ item.provider }}
        </p-tag>
        @if (item.term) {
          <span class="flex-1 truncate">{{ item.term }}</span>
        } @else {
          <span class="flex-1 truncate text-gray-500">无搜索词</span>
        }
        <ng-template #actions>
        <p-button
        actions
        class="absolute right-4 top-1/2 -translate-y-1/2 block"
        styleclass="absolute right-0 top-0 block"
        text
          severity="secondary"
          size="small"
          icon="pi pi-times"
          (click)="handleRemove()"
        ></p-button>
        </ng-template>
      </div>
    </da-search-list-item>
  `,
})
export class SearchHistoryEntryComponent {
  entry = input.required<SearchHistoryEntry>()

  select = output<SearchHistoryEntry>()
  remove = output<SearchHistoryEntry>()

  handleClick() {
    this.select.emit(this.entry())
  }

  handleRemove() {
    this.remove.emit(this.entry())
  }
}
