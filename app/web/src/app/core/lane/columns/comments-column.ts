import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'

import { CommentsTab } from '../../../features/bangumi/components/comments-tab'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-comments-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommentsTab],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'comments',
  },
  template: `
    @if (comments(); as column) {
      <div class="p-4 h-full">
        <da-comments-tab [subjectId]="column.subjectId" [visited]="true" />
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
export class CommentsColumn {
  readonly col = input.required<Column>()

  // Returns null (rather than throwing) when the dynamically-bound column is
  // momentarily a different kind during NgComponentOutlet switching; the
  // template @if then renders nothing instead of crashing change detection.
  protected readonly comments = computed(() => {
    const column = this.col()
    return column.kind === 'comments' ? column : null
  })
}
