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
    @let column = comments();
    <div class="p-4 h-full">
      <da-comments-tab [subjectId]="column.subjectId" [visited]="true" />
    </div>
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

  protected readonly comments = computed(() => {
    const column = this.col()
    if (column.kind !== 'comments') {
      throw new Error('CommentsColumn requires a comments column')
    }
    return column
  })
}
