import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'da-mat-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <i [class]="iconClass" [style.font-variation-settings]="fontVariationSettings">{{ icon() }}</i>
  `,
  host: {
    class: 'inline-flex',
  },
})
export class MaterialIcon {
  icon = input.required<string>()
  variant = input<'rounded' | 'outlined' | 'sharp'>('rounded')
  filled = input<boolean>(false)
  size = input<'small' | 'medium' | 'large'>('medium')
  styleClass = input<string>()

  protected get fontVariationSettings() {
    return this.filled() ? `'FILL' 1` : `'FILL' 0`
  }

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
      if (this.styleClass()) {
        return this.styleClass()
      }
      switch (this.size()) {
        case 'small':
          return 'text-sm'
        case 'large':
          return 'text-lg'
        case 'medium':
          return 'text-base'
      }
    }

    return `${getVariant()} ${getSize()}`
  }
}
