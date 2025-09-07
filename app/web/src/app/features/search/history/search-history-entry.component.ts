import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { Tag } from 'primeng/tag'
import { SearchListItem } from '../search-list-item.component'
import type { SearchHistoryEntry } from './search-history.service'

@Component({
  selector: 'da-search-history-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchListItem, Tag],
  template: `
  <da-search-list-item (click)="onHistoryClick()">
    @let item = entry();
    <div class="flex items-center gap-3 min-h-10">
      <span class="pi pi-history opacity-70"></span>
      <span class="flex-1 truncate">{{item.term }}</span>
      <p-tag
        severity="secondary"
        class="text-xs"
      >
        {{ item.provider }}
      </p-tag>  
    </div>
  </da-search-list-item>
  `,
})
export class SearchHistoryEntryComponent {
  entry = input.required<SearchHistoryEntry>()

  click = output<SearchHistoryEntry>()

  onHistoryClick() {
    this.click.emit(this.entry())
  }
}
