import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { SettingsPanelComponent } from '../../../features/settings/settings-panel.component'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-settings-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SettingsPanelComponent],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'settings',
  },
  template: `
    <da-settings-panel />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
  `,
})
export class SettingsColumn {
  readonly col = input.required<Column>()
}
