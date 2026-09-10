import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { PlaygroundPageComponent } from '../../../features/debug/playground/playground-page.component'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-playground-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaygroundPageComponent],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'playground',
  },
  template: `
    <da-playground-page />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }
  `,
})
export class PlaygroundColumn {
  readonly col = input.required<Column>()
}
