import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'

import type { ShowCardData } from '../../../features/bangumi/components/show-card'
import { TrendingPage } from '../../../features/bangumi/pages/trending/trending-page'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-trending-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendingPage],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'trending',
  },
  template: `
    <da-trending-page
      (openDetails)="onOpenDetails($event)"
      (openWatch)="onOpenWatch($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class TrendingColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  onOpenDetails(item: ShowCardData) {
    this.store.openDetails(item.id, item.title ?? item.altTitle)
  }

  onOpenWatch(item: ShowCardData) {
    this.store.openWatch({
      subjectId: item.id,
      title: item.title ?? item.altTitle,
    })
  }
}
