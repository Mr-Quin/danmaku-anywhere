import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'
import { SearchService } from '../search.service'
import type { SearchHistoryEntry } from '../search-model.type'
import { SearchHistoryService } from './search-history.service'
import { SearchHistoryEntryComponent } from './search-history-entry.component'

@Component({
  selector: 'da-search-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, SearchHistoryEntryComponent],
  template: `
    <div>
      <p class="text-sm text-gray-400 m-2">
        搜索记录
      </p>
      <ul>
      @for (entry of historyEntries(); track entry.timestamp; let i = $index) {
        <da-search-history-entry [entry]="entry" (select)="handleClick(entry)" (remove)="handleRemove(i)" />
      }
      </ul>
    </div>
  `,
  host: {
    class: 'h-full',
  },
})
export class SearchHistoryComponent {
  protected readonly searchService = inject(SearchService)

  private searchHistory = inject(SearchHistoryService)

  historyEntries = computed(() =>
    this.searchHistory.$entries().sort((a, b) => b.timestamp - a.timestamp)
  )

  handleClick(entry: SearchHistoryEntry) {
    this.searchService.search(entry)
  }

  handleRemove(index: number) {
    this.searchHistory.delete(index)
  }
}
