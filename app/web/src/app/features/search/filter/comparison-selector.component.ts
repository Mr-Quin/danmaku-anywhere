import { Component, computed, input, output } from '@angular/core'
import type { MenuItem } from 'primeng/api'
import { Button } from 'primeng/button'
import { MenuModule } from 'primeng/menu'

export type ComparisonOperator = '>=' | '>' | '=' | '<' | '<='

const operatorOptions: { label: string; value: ComparisonOperator }[] = [
  { label: '≥', value: '>=' },
  { label: '>', value: '>' },
  { label: '=', value: '=' },
  { label: '<', value: '<' },
  { label: '≤', value: '<=' },
]

const operatorMap: Record<ComparisonOperator, string> = {
  '>=': '≥',
  '>': '>',
  '=': '=',
  '<': '<',
  '<=': '≤',
}

@Component({
  selector: 'da-comparison-selector',
  standalone: true,
  imports: [MenuModule, Button],
  template: `
    <p-button (click)="menu.toggle($event)" severity="secondary" text size="small" class="flex h-full"
              styleClass="px-2">{{ $displayOp() }}
    </p-button>
    <p-menu #menu [model]="menuItems" [popup]="true" appendTo="body" />
  `,
})
export class ComparisonSelector {
  op = input.required<ComparisonOperator>()
  select = output<ComparisonOperator>()

  $displayOp = computed(() => operatorMap[this.op()])

  menuItems: MenuItem[] = operatorOptions.map((item) => ({
    ...item,
    command: () => this.select.emit(item.value),
  }))
}
