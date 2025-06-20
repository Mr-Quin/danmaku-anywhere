import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'da-mat-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <i [class]="iconClass">{{ icon() }}</i>
  `,
  host: {
    class: 'inline-flex',
  },
})
export class MaterialIcon {
  icon = input.required<string>()
  variant = input<'rounded' | 'outlined' | 'sharp'>('rounded')

  protected get iconClass() {
    switch (this.variant()) {
      case 'outlined':
        return 'material-symbols-outlined'
      case 'sharp':
        return 'material-symbols-sharp'
      default:
        return 'material-symbols-rounded'
    }
  }
}
