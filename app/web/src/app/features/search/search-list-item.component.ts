import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, output } from '@angular/core'

@Component({
  selector: 'da-search-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <li class="relative flex rounded-md">
      <div role="button" tabindex="0"
           class="w-full cursor-pointer p-2 hover:bg-surface-800/30 focus:bg-surface-800/50 focus:outline-none"
           (click)="click.emit()" (keydown.enter)="click.emit()">
        <ng-content />
      </div>
    </li>
  `,
})
export class SearchListItem {
  click = output<void>()
}
