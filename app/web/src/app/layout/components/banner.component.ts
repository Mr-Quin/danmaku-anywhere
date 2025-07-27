import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { MaterialIcon } from '../../shared/components/material-icon'

export interface BannerConfig {
  type?: 'info' | 'warning' | 'success' | 'error'
  dismissible?: boolean
  bgClass?: string
  textClass?: string
}

@Component({
  selector: 'da-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div [class]="getBannerClasses()" class="p-1 flex justify-center relative">
      <div class="text-sm" [class]="config().textClass || 'text-black'">
        <ng-content />
      </div>
      @if (config().dismissible) {
        <button
          class="cursor-pointer absolute right-0 mr-4"
          [class]="config().textClass || 'text-black'"
          (click)="onDismiss.emit()"
        >
          <da-mat-icon icon="close" />
        </button>
      }
    </div>
  `,
})
export class Banner {
  config = input.required<BannerConfig>()
  onDismiss = output<void>()

  protected getBannerClasses(): string {
    const config = this.config()

    if (config.bgClass) {
      return config.bgClass
    }

    const typeClasses = {
      info: 'bg-blue-500',
      warning: 'bg-yellow-400',
      success: 'bg-green-500',
      error: 'bg-red-500',
    }

    return typeClasses[config.type || 'info']
  }
}
