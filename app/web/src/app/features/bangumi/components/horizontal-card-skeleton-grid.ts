import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { HorizontalCardSkeleton } from './horizontal-card-skeleton'

@Component({
  selector: 'da-horizontal-card-skeleton-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HorizontalCardSkeleton],
  template: `
    <div class="grid gap-4">
      @for (item of skeletonItems(); track $index) {
        <da-horizontal-card-skeleton />
      }
    </div>
  `,
})
export class HorizontalCardSkeletonGrid {
  count = input<number>(5)

  protected skeletonItems() {
    return Array.from({ length: this.count() })
  }
}
