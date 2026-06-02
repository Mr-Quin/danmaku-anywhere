import { NgComponentOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'

import { PlaceholderColumn } from './columns/placeholder-column'
import { COLUMN_REGISTRY } from './columns/registry'
import type { Column } from './lane.types'

@Component({
  selector: 'da-column-body-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      [ngComponentOutlet]="component()"
      [ngComponentOutletInputs]="{ col: col() }"
    />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ColumnBodyHost {
  readonly col = input.required<Column>()

  readonly component = computed(() => {
    return COLUMN_REGISTRY[this.col().kind] ?? PlaceholderColumn
  })
}
