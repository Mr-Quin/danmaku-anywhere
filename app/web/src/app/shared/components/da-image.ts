import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core'
import { IMAGE_PLACEHOLDER_DATA } from '../placeholder-data'

@Component({
  selector: 'da-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="$currentSrc()"
      [attr.alt]="alt()"
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.loading]="loading()"
      [attr.fetchpriority]="loading() === 'eager' ? 'high' : 'auto'"
      [class]="styleClass()"
      referrerpolicy="no-referrer"
      decoding="async"
      (error)="onError()"
    />
  `,
})
export class DaImage {
  src = input<string>('')
  alt = input<string>('')
  width = input<number>()
  height = input<number>()
  loading = input<'eager' | 'lazy'>('lazy')
  styleClass = input<string>('')

  protected readonly $currentSrc = linkedSignal(() => this.src())

  protected onError() {
    const source = this.src()
    if (!source || this.$currentSrc() !== source) {
      this.$currentSrc.set(IMAGE_PLACEHOLDER_DATA)
      return
    }
    const separator = source.includes('?') ? '&' : '?'
    this.$currentSrc.set(`${source}${separator}daRetry=1`)
  }
}
