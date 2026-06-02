import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { DetailsPage } from '../../../features/bangumi/pages/details/details-page'
import type { DetailsTab } from '../../../features/bangumi/pages/details/details-tab'
import type { BgmSubject } from '../../../features/bangumi/types/bangumi.types'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-show-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DetailsPage],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'show',
  },
  template: `
    @let column = show();
    <da-details-page
      [id]="column.subjectId"
      [tab]="column.tab ?? 'comments'"
      (tabChange)="onTabChange($event)"
      (startSearch)="onStartSearch($event)"
      (goBack)="onGoBack()"
      (openDetails)="onOpenDetails($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ShowColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  protected readonly show = computed(() => {
    const column = this.col()
    if (column.kind !== 'show') {
      throw new Error('ShowColumn requires a show column')
    }
    return column
  })

  onTabChange(tab: DetailsTab) {
    this.store.setDetailsTab(this.col().id, tab)
  }

  onStartSearch(subject: BgmSubject) {
    const query = subject.nameCN || subject.name
    const id = this.store.openApp('search')
    this.store.setSearchQuery(id, query)
  }

  onGoBack() {
    this.store.openApp('trending')
  }

  onOpenDetails(subjectId: number) {
    this.store.openDetails(subjectId, '')
  }
}
