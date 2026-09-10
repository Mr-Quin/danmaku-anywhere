import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'

import { SearchHistoryComponent } from '../../../features/search/history/search-history.component'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-history-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchHistoryComponent],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'history',
  },
  template: `
    <da-search-history (openSearch)="onOpenSearch($event)" />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
  `,
})
export class HistoryColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  onOpenSearch(term: string) {
    const id = this.store.openApp('search')
    this.store.setSearchQuery(id, term)
  }
}
