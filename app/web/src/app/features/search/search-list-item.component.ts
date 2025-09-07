import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, output } from '@angular/core'

@Component({
  selector: 'da-search-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <li class="relative flex rounded-md p-2 hover:bg-surface-800/30">
      <div role="button" class="w-full cursor-pointer" (click)="click.emit()">
        <ng-content />
      </div>
    </li>
  `,
})
export class SearchListItem {
  click = output<void>()
}
