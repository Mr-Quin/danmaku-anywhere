import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Card } from 'primeng/card'
import { Skeleton } from 'primeng/skeleton'

@Component({
  selector: 'da-show-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, Skeleton],
  template: `
    <p-card styleClass="overflow-hidden">
      <ng-template #header>
        <div class="relative aspect-square md:aspect-[2/3]">
          <p-skeleton width="100%" height="100%" />
        </div>
      </ng-template>

      <ng-template #content>
        <div class="space-y-2">
          <p-skeleton width="80%" height="24px" />
          <p-skeleton width="60%" height="16px" />
          <div class="flex flex-wrap gap-1">
            <p-skeleton width="40%" height="12px" />
            <p-skeleton width="30%" height="12px" />
            <p-skeleton width="50%" height="12px" />
          </div>
        </div>
      </ng-template>

      <ng-template #footer>
        <div class="flex justify-between">
          <p-skeleton width="60px" height="32px" />
          <p-skeleton width="60px" height="32px" />
        </div>
      </ng-template>
    </p-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ShowCardSkeleton {}
