import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
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
import { InputMask } from 'primeng/inputmask'
import { InputNumber } from 'primeng/inputnumber'
import { type Menu, MenuModule } from 'primeng/menu'
import {
  type ComparisonOperator,
  ComparisonSelector,
} from './comparison-selector.component'

interface SearchFilterModel {
  op?: ComparisonOperator
  value: string | number
}

type SearchFilterType = 'rating' | 'rank' | 'date'

@Component({
  selector: 'da-search-filter-item',
  standalone: true,
  imports: [
    ComparisonSelector,
    InputGroupModule,
    InputGroupAddonModule,
    Button,
    MenuModule,
    InputNumber,
    InputMask,
    FormsModule,
    NgTemplateOutlet,
  ],
  template: `
    <p-inputgroup class="h-6">
      @if (showClose()) {
        <p-inputgroup-addon class="min-w-0">
          <p-button text severity="secondary" size="small" icon="pi pi-times" styleClass="p-0 w-6"
                    (click)="remove.emit()"></p-button>
        </p-inputgroup-addon>
      }
      <p-inputgroup-addon class="min-w-0">
        <p class="text-sm font-medium text-gray-400">{{ label() }}</p>
      </p-inputgroup-addon>
      @if (showOperator()) {
        <p-inputgroup-addon class="min-w-0">
          <da-comparison-selector class="h-full" [op]="$comparison()" (select)="handleComparisonChange($event)" />
        </p-inputgroup-addon>
      }
      <p-inputgroup-addon class="min-w-0">
        <p-button text severity="secondary" size="small" (click)="menu.toggle($event)">{{ $value() }}</p-button>
      </p-inputgroup-addon>
    </p-inputgroup>
    <p-menu #menu [popup]="true" (onHide)="commitValue()">
      <ng-template #start>
        @if (type() === 'rating') {
          <ng-container *ngTemplateOutlet="ratingInput"></ng-container>
        } @else if (type() === 'rank') {
          <ng-container *ngTemplateOutlet="rankInput"></ng-container>
        } @else if (type() === 'date') {
          <ng-container *ngTemplateOutlet="dateInput"></ng-container>
        }
      </ng-template>
    </p-menu>

    <ng-template #ratingInput>
      <p-input-number name="rating" autofocus [(ngModel)]="$tempValue" mode="decimal"
                      [maxFractionDigits]="1" useGrouping="false" [min]="0"
                      [max]="10"
                      [step]="0.1" (onKeyDown)="handleInputKeydown($event)"></p-input-number>
    </ng-template>

    <ng-template #rankInput>
      <p-input-number name="rank" autofocus [(ngModel)]="$tempValue" useGrouping="false" [min]="1" [step]="1"
                      [showButtons]="false" (onKeyDown)="handleInputKeydown($event)"></p-input-number>
    </ng-template>

    <ng-template #dateInput>
      <p-input-mask name="date" autofocus [(ngModel)]="$tempValue" mask="9999-99-99" placeholder="2025-01-01" [invalid]="!$isValueValid()"
                    (onKeydown)="handleInputKeydown($event)"></p-input-mask>
    </ng-template>
  `,
})
export class SearchFilterItem {
  label = input.required<string>()
  filter = input.required<SearchFilterModel>()
  type = input<SearchFilterType>('rating')
  showOperator = input<boolean>(true)
  showClose = input<boolean>(true)

  change = output<SearchFilterModel>()
  remove = output<void>()

  $menu = viewChild.required<Menu>('menu')

  $comparison = signal<ComparisonOperator>('=')
  $value = signal<string | number>(0)
  $tempValue = linkedSignal(() => this.$value())
  $isValueValid = computed(() => {
    return this.validateValue(this.$tempValue())
  })

  constructor() {
    effect(() => {
      const filter = this.filter()
      if (filter.op) {
        this.$comparison.set(filter.op)
      }
      this.$value.set(this.filter().value)
    })
  }

  handleComparisonChange(op: ComparisonOperator) {
    this.$comparison.set(op)
    this.emitChange()
  }

  commitValue() {
    if (!this.validateValue(this.$tempValue())) {
      return
    }
    this.$value.set(this.$tempValue())
    this.emitChange()
  }

  handleInputKeydown(event: Event) {
    if (!this.$menu().visible || !(event instanceof KeyboardEvent)) {
      return
    }
    if (event.key === 'Escape') {
      // revert to the original value
      this.$tempValue.set(this.$value())
      this.$menu().hide()
    } else if (event.key === 'Enter') {
      if (!this.$isValueValid()) {
        return
      }
      this.$menu().hide()
    }
  }

  private validateValue(value: string | number) {
    const type = this.type()
    if (type === 'rating') {
      return Number(value) >= 0 && Number(value) <= 10
    }
    if (type === 'rank') {
      return Number(value) >= 1
    }
    if (type === 'date') {
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value.toString())) {
        return false
      }
      const [, month, day] = value.toString().split('-').map(Number)
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false
      }
      return true
    }
    return true
  }

  private emitChange() {
    if (this.showOperator()) {
      this.change.emit({ op: this.$comparison(), value: this.$value() })
    } else {
      this.change.emit({ value: this.$value() })
    }
  }
}
