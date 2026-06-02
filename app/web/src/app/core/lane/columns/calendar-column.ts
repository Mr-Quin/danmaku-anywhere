import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'

import type { ShowCardData } from '../../../features/bangumi/components/show-card'
import { CalendarPage } from '../../../features/bangumi/pages/calendar/calendar-page'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-calendar-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalendarPage],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'calendar',
  },
  template: `
    <da-calendar-page
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
export class CalendarColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  onOpenDetails(item: ShowCardData) {
    this.store.openDetails(item.id, item.title ?? item.altTitle)
  }

  onOpenWatch(item: ShowCardData) {
    // A bangumi subject has no direct source; watching means searching the
    // kazumi rules for it, then picking an episode in the player.
    const id = this.store.openApp('search')
    this.store.setSearchQuery(id, item.title ?? item.altTitle)
  }
}
