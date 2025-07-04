import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Card } from 'primeng/card'
import { Skeleton } from 'primeng/skeleton'

@Component({
  selector: 'da-horizontal-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Skeleton],
  template: `
    <p-card>
      <div class="flex gap-4">
        <p-skeleton width="80px" height="112px" />
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2">
            <p-skeleton width="80px" height="20px" />
            <p-skeleton width="60px" height="20px" />
          </div>
          <p-skeleton width="70%" height="24px" />
          <p-skeleton width="50%" height="16px" />
          <p-skeleton width="40%" height="16px" />
        </div>
      </div>
    </p-card>
  `,
})
export class HorizontalCardSkeleton {}
