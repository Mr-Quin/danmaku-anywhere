import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { KazumiPolicyImport } from '../../../features/kazumi/components/kazumi-policy-import'
import { KazumiPolicyManage } from '../../../features/kazumi/components/kazumi-policy-manage'
import type { Column } from '../lane.types'

@Component({
  selector: 'da-rules-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KazumiPolicyManage, KazumiPolicyImport],
  host: {
    'data-testid': 'column-body',
    '[attr.data-kind]': 'col().kind',
  },
  template: `
    <div class="p-4 space-y-6 overflow-y-auto h-full">
      <da-kazumi-policy-manage />
      <da-kazumi-policy-import />
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class RulesColumn {
  readonly col = input.required<Column>()
}
