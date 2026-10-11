import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { VideoDebugPageComponent } from '../../../features/debug/video-debug-page.component'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-debug-video-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoDebugPageComponent],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'debug-video',
  },
  template: `
    <da-video-debug-page />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }
  `,
})
export class DebugVideoColumn {
  readonly col = input.required<Column>()
}
