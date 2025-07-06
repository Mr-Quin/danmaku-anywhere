import { CommonModule, NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'

export type AvatarSize = 'small' | 'medium' | 'large'

@Component({
  selector: 'da-user-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgOptimizedImage],
  template: `
    @let src = imageUrl();
    @if (src) {
      <img
        [ngSrc]="src"
        [width]="sizeInPixels()"
        [height]="sizeInPixels()"
        [alt]="altText()"
        class="rounded-full object-cover"
        [class]="sizeClass()"
      />
    } @else {
      <div class="rounded-full" [class]="sizeClass()"></div>
    }
  `,
})
export class UserAvatar {
  imageUrl = input<string>()
  altText = input<string>()
  size = input<AvatarSize>('medium')
  useOptimizedImage = input<boolean>(true)

  protected sizeInPixels(): number {
    switch (this.size()) {
      case 'small':
        return 32
      case 'medium':
        return 40
      case 'large':
        return 48
      default:
        return 40
    }
  }

  protected sizeClass(): string {
    switch (this.size()) {
      case 'small':
        return 'w-8 h-8'
      case 'medium':
        return 'w-10 h-10'
      case 'large':
        return 'w-12 h-12'
      default:
        return 'w-10 h-10'
    }
  }
}
