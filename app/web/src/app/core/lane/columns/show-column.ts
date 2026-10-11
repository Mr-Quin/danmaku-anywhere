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
    @if (show(); as column) {
      <da-details-page
        [id]="column.subjectId"
        [tab]="column.tab ?? 'comments'"
        (tabChange)="onTabChange($event)"
        (startSearch)="onStartSearch($event)"
        (goBack)="onGoBack()"
        (openDetails)="onOpenDetails($event)"
      />
    }
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

  // Null (not throw) on a transient kind mismatch during NgComponentOutlet
  // switching; the template @if then renders nothing instead of crashing.
  protected readonly show = computed(() => {
    const column = this.col()
    return column.kind === 'show' ? column : null
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
