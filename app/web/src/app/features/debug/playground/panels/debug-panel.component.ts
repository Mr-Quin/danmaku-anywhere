import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { Button } from 'primeng/button'

@Component({
  selector: 'da-debug-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="flex flex-col h-full border rounded border-surface">
      <div class="flex items-center justify-between px-2 py-1 bg-surface-50 dark:bg-surface-800 border-b border-surface">
        <span class="font-medium text-sm">{{ title() }}</span>
        <p-button
          icon="pi pi-times"
          [rounded]="true"
          [text]="true"
          severity="danger"
          size="small"
          (onClick)="remove.emit()"
        />
      </div>
      <ng-content select="[toolbar]" />
      <div class="flex-1 min-h-0">
        <ng-content />
      </div>
    </div>
  `,
})
export class DebugPanelComponent {
  readonly title = input.required<string>()
  readonly remove = output()
}
