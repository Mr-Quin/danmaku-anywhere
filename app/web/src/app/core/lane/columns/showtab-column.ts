import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'

import { CharactersTab } from '../../../features/bangumi/components/characters-tab'
import { CommentsTab } from '../../../features/bangumi/components/comments-tab'
import { EpisodesTab } from '../../../features/bangumi/components/episodes-tab'
import { RecommendationsTab } from '../../../features/bangumi/components/recommendations-tab'
import { RelationsTab } from '../../../features/bangumi/components/relations-tab'
import { ReviewsTab } from '../../../features/bangumi/components/reviews-tab'
import { StaffTab } from '../../../features/bangumi/components/staff-tab'
import { TopicsTab } from '../../../features/bangumi/components/topics-tab'
import { LaneStore } from '../lane.store'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-showtab-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EpisodesTab,
    CharactersTab,
    StaffTab,
    RelationsTab,
    RecommendationsTab,
    ReviewsTab,
    TopicsTab,
    CommentsTab,
  ],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'showtab',
  },
  template: `
    @if (showtab(); as column) {
    <div class="p-4">
      @switch (column.tab) {
        @case ('comments') {
          <da-comments-tab [subjectId]="column.subjectId" [visited]="true" />
        }
        @case ('episodes') {
          <da-episodes-tab [subjectId]="column.subjectId" [visited]="true" />
        }
        @case ('characters') {
          <da-characters-tab [subjectId]="column.subjectId" [visited]="true" />
        }
        @case ('staff') {
          <da-staff-tab [subjectId]="column.subjectId" [visited]="true" />
        }
        @case ('relations') {
          <da-relations-tab
            [subjectId]="column.subjectId"
            [visited]="true"
            (openDetails)="onOpenDetails($event)"
          />
        }
        @case ('recommendations') {
          <da-recommendations-tab
            [subjectId]="column.subjectId"
            [visited]="true"
            (openDetails)="onOpenDetails($event)"
          />
        }
        @case ('reviews') {
          <da-reviews-tab [subjectId]="column.subjectId" [visited]="true" />
        }
        @case ('topics') {
          <da-topics-tab [subjectId]="column.subjectId" [visited]="true" />
        }
      }
    </div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ShowtabColumn {
  readonly col = input.required<Column>()

  private readonly store = inject(LaneStore)

  // Null (not throw) on a transient kind mismatch during NgComponentOutlet
  // switching; the template @if then renders nothing instead of crashing.
  protected readonly showtab = computed(() => {
    const column = this.col()
    return column.kind === 'showtab' ? column : null
  })

  onOpenDetails(subjectId: number) {
    this.store.openDetails(subjectId, '')
  }
}
