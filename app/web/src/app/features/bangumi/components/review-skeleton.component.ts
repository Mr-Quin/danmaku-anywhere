import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Skeleton } from 'primeng/skeleton'

@Component({
  selector: 'da-review-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Skeleton],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <p-skeleton shape="circle" size="2.5rem" />
          <div>
            <p-skeleton width="8rem" height="1rem" />
            <p-skeleton width="6rem" height="0.875rem" class="mt-1" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <p-skeleton width="4rem" height="1.5rem" />
        </div>
      </div>
      <p-skeleton width="60%" height="1.5rem" />
      <p-skeleton width="100%" height="1rem" />
      <p-skeleton width="90%" height="1rem" />
      <p-skeleton width="80%" height="1rem" />
    </div>
  `,
})
export class ReviewSkeletonComponent {}
