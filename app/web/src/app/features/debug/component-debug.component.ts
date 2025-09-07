import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import type { LegacyBgmSubject } from '../bangumi/types/bangumi.types'
import { BangumiSearchResultListItem } from '../search/bangumi/search-result-list-item-bangumi.component'
import { SearchFilterItem } from '../search/filter/search-filter-item.component'
import type { SearchHistoryEntry } from '../search/history/search-history.service'
import { SearchHistoryEntryComponent } from '../search/history/search-history-entry.component'
import legacyBangumiSubjects from './component-data/legacy-bangumi-subjects.json' with {
  type: 'json',
}
import searchHistory from './component-data/search-history-v1.json' with {
  type: 'json',
}

@Component({
  selector: 'da-component-debug',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BangumiSearchResultListItem,
    SearchHistoryEntryComponent,
    SearchFilterItem,
  ],
  template: `
    <div>
      <da-rating-filter filter="<5" label="评分" />
      @for (subject of bangumiSubjects; track subject.id) {
        <da-bangumi-search-result-list-item [subject]="subject" />
      }
      @for (entry of searchHistory; track entry.timestamp) {
        <da-search-history-entry [entry]="entry" />
      }
    </div>
  `,
})
export class ComponentDebugComponent {
  readonly bangumiSubjects: LegacyBgmSubject[] =
    legacyBangumiSubjects as unknown as LegacyBgmSubject[]

  readonly searchHistory: SearchHistoryEntry[] =
    searchHistory as unknown as SearchHistoryEntry[]
}
