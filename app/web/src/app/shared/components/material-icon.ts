import { ChangeDetectionStrategy, Component, input } from '@angular/core'

type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

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
  size = input<SizeVariant>('md')
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
        case 'xs':
          return 'text-xs'
        case 'sm':
          return 'text-sm'
        case 'lg':
          return 'text-lg'
        case 'xl':
          return 'text-xl'
        case '2xl':
          return 'text-2xl'
        case 'md':
          return 'text-base'
      }
    }

    return `${getVariant()} ${getSize()}`
  }
}
