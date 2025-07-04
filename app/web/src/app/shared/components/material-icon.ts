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
  size = input<'small' | 'medium' | 'large'>('medium')
  styleClass = input<string>()

  protected get iconClass() {
    const getVariant = () => {
      switch (this.variant()) {
        case 'outlined':
          return 'material-symbols-outlined'
        case 'sharp':
          return 'material-symbols-sharp'
        default:
          return 'material-symbols-rounded'
      }
    }

    const getSize = () => {
      if (this.styleClass) {
        return this.styleClass
      }
      switch (this.size()) {
        case 'small':
          return 'text-sm'
        case 'large':
          return 'text-lg'
        default:
          return 'text-md'
      }
    }

    return `${getVariant()} ${getSize()}`
  }
}
