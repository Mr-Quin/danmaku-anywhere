import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MaterialIcon } from '../../../shared/components/material-icon'

@Component({
  selector: 'da-navigation-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, MaterialIcon],
  template: `
    @let _icon = icon();
    @if (disabled()) {
      <div
        class="relative flex items-center gap-3 px-3 py-2 rounded-lg pointer-events-none text-gray-500">
        @if (_icon) {
          <da-mat-icon [icon]="_icon" size="xl" />
        }
        <span>{{ label() }}</span>
      </div>
    } @else {
      <a
        [routerLink]="path()"
        routerLinkActive="text-primary after:absolute after:size-full after:border-l-4 after:left-0 after:border-primary-500"
        class="relative flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors"
      >
        @if (_icon) {
          <da-mat-icon [icon]="_icon" size="xl" />
        }
        <span>{{ label() }}</span>
      </a>
    }
  `,
})
export class NavigationItemComponent {
  label = input.required<string>()
  path = input.required<string>()
  icon = input<string>()
  disabled = input<boolean>()
}
