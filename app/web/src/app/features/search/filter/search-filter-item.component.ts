import {
  Component,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputNumber } from 'primeng/inputnumber'
import { type Menu, MenuModule } from 'primeng/menu'
import {
  type ComparisonOperator,
  ComparisonSelector,
} from './comparison-selector.component'

@Component({
  selector: 'da-rating-filter',
  standalone: true,
  imports: [
    ComparisonSelector,
    InputGroupModule,
    InputGroupAddonModule,
    Button,
    MenuModule,
    InputNumber,
    FormsModule,
  ],
  template: `
    <p-inputgroup class="h-6">
      <p-inputgroup-addon class="min-w-0">
        <p-button text severity="secondary" size="small" icon="pi pi-times" styleClass="p-0 w-6"
                  (click)="remove.emit()"></p-button>
      </p-inputgroup-addon>
      <p-inputgroup-addon class="min-w-0">
        <p class="text-sm font-medium text-gray-400">{{ label() }}</p>
      </p-inputgroup-addon>
      <p-inputgroup-addon class="min-w-0">
        <da-comparison-selector class="h-full" [op]="$comparison()" (select)="handleComparisonChange($event)" />
      </p-inputgroup-addon>
      <p-inputgroup-addon class="min-w-0">
        <p-button text severity="secondary" size="small" (click)="menu.toggle($event)">{{ $value() }}</p-button>
      </p-inputgroup-addon>
    </p-inputgroup>
    <p-menu #menu [popup]="true" (onHide)="commitValue()">
      <ng-template #start>
        <p-input-number #numberInput name="rating" autofocus [(ngModel)]="$tempValue" mode="decimal" [maxFractionDigits]="1" [min]="0"
                        [max]="10"
                        [step]="0.1" (onKeyDown)="handleInputKeydown($event)"></p-input-number>
      </ng-template>
    </p-menu>
  `,
})
export class SearchFilterItem {
  label = input.required<string>()
  filter = input.required<string>() // e.g. >=10.0, <5
  change = output<string>()
  remove = output<void>()

  $menu = viewChild.required<Menu>('menu')
  $numberInput = viewChild.required<InputNumber>('numberInput')

  $comparison = signal<ComparisonOperator>('=')
  $value = signal<number>(0)
  $tempValue = linkedSignal(() => this.$value())

  constructor() {
    effect(() => {
      const filter = this.filter()
      const match = /^(>=|>|=|<|<=)(.+)$/.exec(filter)
      if (!match) {
        return
      }
      this.$comparison.set(match[1] as ComparisonOperator)
      this.$value.set(Number(match[2]))
    })
  }

  handleComparisonChange(op: ComparisonOperator) {
    this.$comparison.set(op)
    this.emitChange()
  }

  commitValue() {
    this.$value.set(this.$tempValue())
    this.emitChange()
  }

  handleInputKeydown(event: KeyboardEvent) {
    if (!this.$menu().visible) {
      return
    }
    if (event.key === 'Escape') {
      // revert to the original value
      this.$tempValue.set(this.$value())
      this.$menu().hide()
    } else if (event.key === 'Enter') {
      this.$menu().hide()
    }
  }

  private emitChange() {
    this.change.emit(`${this.$comparison()}${this.$value()}`)
  }
}
