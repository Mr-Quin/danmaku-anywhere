import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { LocalPlayerPageComponent } from '../../../features/local/local-player-page.component'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-local-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalPlayerPageComponent],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'local',
  },
  template: `
    <da-local-player-page />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }
  `,
})
export class LocalColumn {
  readonly col = input.required<Column>()
}
