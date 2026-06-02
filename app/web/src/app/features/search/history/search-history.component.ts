import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import type { SearchHistoryEntry } from '../search-model.type'
import { SearchHistoryService } from './search-history.service'
import { SearchHistoryEntryComponent } from './search-history-entry.component'

@Component({
  selector: 'da-search-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, SearchHistoryEntryComponent],
  template: `
      <p class="text-sm text-gray-400 m-2">
        搜索记录
      </p>
      <ul class="overflow-auto">
      @for (entry of historyEntries(); track entry.timestamp; let i = $index) {
        <da-search-history-entry [entry]="entry" (select)="handleClick(entry)" (remove)="handleRemove(i)" />
      }
      </ul>
  `,
  host: {
    class: 'h-full flex flex-col',
  },
})
export class SearchHistoryComponent {
  private searchHistory = inject(SearchHistoryService)

  readonly openSearch = output<string>()

  historyEntries = computed(() =>
    this.searchHistory.$entries().toSorted((a, b) => b.timestamp - a.timestamp)
  )

  handleClick(entry: SearchHistoryEntry) {
    this.openSearch.emit(entry.term)
  }

  handleRemove(index: number) {
    this.searchHistory.delete(index)
  }
}
