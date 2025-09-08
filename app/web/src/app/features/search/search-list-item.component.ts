import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  output,
  type TemplateRef,
} from '@angular/core'

@Component({
  selector: 'da-search-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <li class="relative flex rounded-md overflow-hidden">
      <div role="button" tabindex="0"
           class="w-full cursor-pointer p-2 hover:bg-surface-800/30 focus:bg-surface-800/50 focus:outline-none"
           (click)="handleClick()" (keydown.enter)="handleClick()">
        <ng-content />
      </div>
      @if (actions()) {
        <ng-container *ngTemplateOutlet="actions()"></ng-container>
      }
    </li>
  `,
})
export class SearchListItem {
  select = output<void>()

  actions = contentChild<TemplateRef<unknown>>('actions')

  handleClick() {
    this.select.emit()
  }
}
